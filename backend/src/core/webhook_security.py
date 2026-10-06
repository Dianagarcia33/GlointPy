from __future__ import annotations
import urllib.parse
import ipaddress
import socket
import asyncio
from typing import Tuple, Optional, Union
from src.core.config import settings

# Red Carrier-Grade NAT (RFC 6598)
CGNAT_NETWORK = ipaddress.ip_network("100.64.0.0/10")

# Nombres de host internos, de desarrollo o endpoints de metadatos de proveedores de nube
BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "instance-data",
    "metadata.internal"
}

# Sufijos de dominios locales o internos
BLOCKED_DOMAIN_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".corp",
    ".home",
    ".intranet",
    ".test"
)


def is_ip_disallowed(ip: Union[ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
    """
    Verifica si una dirección IP pertenece a rangos de red internos, privados,
    loopback, link-local, reservados, multicast o CGNAT (protección SSRF).
    """
    return (
        ip.is_private or
        ip.is_loopback or
        ip.is_link_local or
        ip.is_reserved or
        ip.is_multicast or
        ip.is_unspecified or
        (isinstance(ip, ipaddress.IPv4Address) and ip in CGNAT_NETWORK)
    )


def validate_webhook_url_security(url_str: Optional[str]) -> Optional[str]:
    """
    Valida la sintaxis, esquema y host de la URL de webhook en tiempo de creación o edición.
    - Exige protocolo HTTPS obligatorio (HTTP solo permitido si el entorno es desarrollo local explícito).
    - Bloquea esquemas no seguros (ftp, javascript, file, etc.).
    - Bloquea hostnames internos (localhost, *.local, etc.).
    - Bloquea direcciones IP privadas, loopback (127.0.0.1), link-local (169.254.169.254).
    """
    if not url_str or not url_str.strip():
        return None

    cleaned_url = url_str.strip()

    try:
        parsed = urllib.parse.urlparse(cleaned_url)
    except Exception:
        raise ValueError("La URL de webhook no tiene una estructura válida.")

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise ValueError("El protocolo del webhook no es válido. Debe iniciar con https://")

    # En entornos de staging/producción, HTTPS es estrictamente obligatorio
    is_dev = settings.ENVIRONMENT.lower() in ("development", "dev", "local", "test")
    if scheme != "https" and not is_dev:
        raise ValueError("La URL de webhook debe utilizar HTTPS (https://) para garantizar el cifrado TLS.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError("La URL de webhook debe incluir un nombre de host o dominio válido.")

    # Bloqueo de nombres de host locales/internos
    if hostname in BLOCKED_HOSTNAMES or any(hostname.endswith(s) for s in BLOCKED_DOMAIN_SUFFIXES):
        raise ValueError(
            f"No se permiten URLs de webhook hacia direcciones locales o internas ('{hostname}'). Protección SSRF activa."
        )

    # Bloqueo de direcciones IP literales peligrosas
    try:
        ip = ipaddress.ip_address(hostname)
        if is_ip_disallowed(ip):
            raise ValueError(
                f"No se permite registrar direcciones IP privadas, loopback o de metadatos ('{hostname}') para el webhook."
            )
    except ValueError as e:
        if "No se permite registrar direcciones IP" in str(e):
            raise
        # No es una IP numérica literal, es un nombre de dominio (se verifica por DNS al despachar)

    return cleaned_url


async def verify_webhook_destination_safety(url_str: str, timeout: float = 3.0) -> Tuple[bool, str]:
    """
    Verificación asíncrona y no bloqueante previa al despacho del webhook.
    Resuelve el dominio por DNS y comprueba que ninguna de las IPs de destino
    sea privada o interna, mitigando ataques de DNS rebinding.
    """
    try:
        parsed = urllib.parse.urlparse(url_str)
        scheme = (parsed.scheme or "").lower()
        if scheme not in ("http", "https"):
            return False, f"Esquema de URL no admitido: {scheme}"

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False, "Nombre de host no encontrado en la URL"

        if hostname in BLOCKED_HOSTNAMES or any(hostname.endswith(s) for s in BLOCKED_DOMAIN_SUFFIXES):
            return False, f"Nombre de host interno bloqueado: {hostname}"

        try:
            ip = ipaddress.ip_address(hostname)
            if is_ip_disallowed(ip):
                return False, f"Dirección IP interna no permitida: {ip}"
        except ValueError:
            # Es un nombre de dominio, realizamos resolución DNS con timeout estricto
            loop = asyncio.get_running_loop()
            port = parsed.port or (443 if scheme == "https" else 80)
            try:
                addr_info = await asyncio.wait_for(
                    loop.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP),
                    timeout=timeout
                )
                for entry in addr_info:
                    resolved_ip_str = entry[4][0]
                    resolved_ip = ipaddress.ip_address(resolved_ip_str)
                    if is_ip_disallowed(resolved_ip):
                        return False, f"El dominio resuelve a una IP interna no permitida ({resolved_ip_str})"
            except asyncio.TimeoutError:
                return False, "Tiempo de espera agotado al resolver DNS del webhook"
            except socket.gaierror as e:
                return False, f"No se pudo resolver el dominio del webhook: {str(e)}"

        return True, "OK"
    except Exception as e:
        return False, f"Error validando destino de webhook: {str(e)}"
