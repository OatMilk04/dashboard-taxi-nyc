import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Escala de colores (Amarillo pálido = 0 viajes, Rojo oscuro = Muchos viajes)
const getColor = (count) => {
  return count > 50000 ? '#800026' :
         count > 25000  ? '#BD0026' :
         count > 10000  ? '#E31A1C' :
         count > 5000  ? '#FC4E2A' :
         count > 2500   ? '#FD8D3C' :
         count > 1000   ? '#FEB24C' :
         count > 500   ? '#FED976' :
                        '#FFEDA0'; 
};

const TaxiMap = ({ zoneData }) => {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // USAMOS TU ENLACE ONLINE
    const mapUrl = 'https://raw.githubusercontent.com/zachpinto/nyc-taxi-zones/master/data/external/NYC_Taxi_Zones.geojson';

    console.log("🔄 Descargando mapa desde internet...");

    fetch(mapUrl)
      .then(res => {
        if (!res.ok) throw new Error("Error al descargar el mapa desde GitHub");
        return res.json();
      })
      .then(data => {
        // --- DIAGNÓSTICO VISUAL (MIRA LA CONSOLA DEL NAVEGADOR) ---
        if (data.features && data.features.length > 0) {
           console.log("✅ Mapa descargado. Propiedades de la primera zona:", data.features[0].properties);
           // Esto nos dirá si se llama 'objectid', 'location_id', 'zone_id', etc.
        }
        setGeoData(data);
      })
      .catch(err => console.error("❌ Error cargando mapa:", err));
  }, []);

  const style = (feature) => {
    const props = feature.properties;
    
    // --- DETECTIVE DE IDs ---
    // Probamos todos los nombres posibles que suelen usar estos archivos
    const rawId = props.objectid || props.OBJECTID || props.location_id || props.LocationID || props.id;
    
    // Convertimos a texto para que coincida con tu base de datos (ej. "1" vs 1)
    const zoneId = String(rawId);
    
    // Buscamos cuántos viajes hay en TU base de datos
    const count = zoneData[zoneId] || 0;

    return {
      fillColor: getColor(count),
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const name = props.zone || props.neighborhood || "Zona Desconocida";
    const rawId = props.objectid || props.OBJECTID || props.location_id || props.LocationID;
    const count = zoneData[String(rawId)] || 0;

    layer.bindPopup(`
      <div style="text-align:center">
        <strong>${name}</strong><br/>
        <span style="color:gray; font-size:0.8em">ID Mapa: ${rawId}</span><br/>
        Viajes: <b style="font-size:1.2em">${count}</b>
      </div>
    `);
  };

  return (
    <MapContainer center={[40.7128, -74.0060]} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}>
      <TileLayer 
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
      />
      
      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={style} 
          onEachFeature={onEachFeature} 
        />
      )}
    </MapContainer>
  );
};

export default TaxiMap;
