import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class IPRateLimiter:
    """Rate limiter en memoria por dirección IP para endpoints sensibles como Login."""
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60, block_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.block_seconds = block_seconds
        self.attempts = defaultdict(list)
        self.blocked_ips = {}

    def check_rate_limit(self, request: Request):
        client_ip = self.get_client_ip(request)
        now = time.time()

        # 1. Verificar si la IP ya está bloqueada
        if client_ip in self.blocked_ips:
            blocked_until = self.blocked_ips[client_ip]
            if now < blocked_until:
                remaining_seconds = int(blocked_until - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiadas solicitudes de inicio de sesión desde esta IP. Bloqueado por {remaining_seconds} segundos.",
                    headers={"Retry-After": str(remaining_seconds)}
                )
            else:
                del self.blocked_ips[client_ip]

        # 2. Limpiar intentos viejos
        self.attempts[client_ip] = [t for t in self.attempts[client_ip] if now - t < self.window_seconds]

        # 3. Si excede el máximo de intentos en la ventana
        if len(self.attempts[client_ip]) >= self.max_attempts:
            self.blocked_ips[client_ip] = now + self.block_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Límite de intentos superado. Dirección IP bloqueada temporalmente durante {self.block_seconds // 60} minutos.",
                headers={"Retry-After": str(self.block_seconds)}
            )

    def record_failed_attempt(self, request: Request):
        client_ip = self.get_client_ip(request)
        now = time.time()
        self.attempts[client_ip].append(now)

    def reset_attempts(self, request: Request):
        client_ip = self.get_client_ip(request)
        if client_ip in self.attempts:
            del self.attempts[client_ip]
        if client_ip in self.blocked_ips:
            del self.blocked_ips[client_ip]

    @staticmethod
    def get_client_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"


# Instancia singleton del limitador de tasa para login
login_rate_limiter = IPRateLimiter(max_attempts=5, window_seconds=60, block_seconds=300)
