import { useState, useEffect } from 'react';

export interface Department {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
}

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: 1, name: "Antioquia" },
  { id: 2, name: "Bogotá D.C." },
  { id: 3, name: "Valle del Cauca" },
  { id: 4, name: "Atlántico" },
  { id: 5, name: "Bolívar" },
  { id: 6, name: "Santander" },
  { id: 7, name: "Caldas" },
  { id: 8, name: "Risaralda" },
  { id: 9, name: "Norte de Santander" },
  { id: 10, name: "Tolima" },
  { id: 11, name: "Meta" },
  { id: 12, name: "Magdalena" },
  { id: 13, name: "Cesar" },
  { id: 14, name: "Córdoba" },
  { id: 15, name: "Nariño" }
];

const FALLBACK_CITIES: Record<string, City[]> = {
  "1": [{ id: 101, name: "Medellín" }, { id: 102, name: "Bello" }, { id: 103, name: "Envigado" }, { id: 104, name: "Itagüí" }, { id: 105, name: "Rionegro" }],
  "2": [{ id: 201, name: "Bogotá" }],
  "3": [{ id: 301, name: "Cali" }, { id: 302, name: "Palmira" }, { id: 303, name: "Tuluá" }, { id: 304, name: "Buenaventura" }, { id: 305, name: "Yumbo" }],
  "4": [{ id: 401, name: "Barranquilla" }, { id: 402, name: "Soledad" }],
  "5": [{ id: 501, name: "Cartagena" }],
  "6": [{ id: 601, name: "Bucaramanga" }, { id: 602, name: "Floridablanca" }, { id: 603, name: "Girón" }],
  "7": [{ id: 701, name: "Manizales" }],
  "8": [{ id: 801, name: "Pereira" }],
  "9": [{ id: 901, name: "Cúcuta" }],
  "10": [{ id: 1001, name: "Ibagué" }],
  "11": [{ id: 1101, name: "Villavicencio" }],
  "12": [{ id: 1201, name: "Santa Marta" }],
  "13": [{ id: 1301, name: "Valledupar" }],
  "14": [{ id: 1401, name: "Montería" }],
  "15": [{ id: 1501, name: "Pasto" }]
};

export function useColombiaCities() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [customCity, setCustomCity] = useState<string>('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const response = await fetch('https://api-colombia.com/api/v1/Department');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        if (mounted) setDepartments(sorted);
      } catch (err) {
        if (mounted) setDepartments(FALLBACK_DEPARTMENTS);
      } finally {
        if (mounted) setLoadingDepartments(false);
      }
    };
    fetchDepartments();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDepartmentChange = async (deptId: string) => {
    setSelectedDepartmentId(deptId);
    setSelectedCity('');
    setCustomCity('');
    setCities([]);

    if (!deptId) return;

    try {
      setLoadingCities(true);
      const response = await fetch(`https://api-colombia.com/api/v1/Department/${deptId}/cities`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setCities([...sorted, { id: 9999, name: 'Otra' }]);
    } catch (err) {
      const list = FALLBACK_CITIES[deptId] || [];
      setCities([...list, { id: 9999, name: 'Otra' }]);
    } finally {
      setLoadingCities(false);
    }
  };

  const finalCity = selectedCity === 'Otra' ? customCity : selectedCity;

  const reset = () => {
    setSelectedDepartmentId('');
    setSelectedCity('');
    setCustomCity('');
    setCities([]);
  };

  return {
    departments,
    cities,
    selectedDepartmentId,
    selectedCity,
    customCity,
    loadingDepartments,
    loadingCities,
    handleDepartmentChange,
    setSelectedCity,
    setCustomCity,
    finalCity,
    reset,
  };
}
