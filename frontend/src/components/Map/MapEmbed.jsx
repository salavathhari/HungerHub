import React, { useEffect, useState } from 'react'
import './MapEmbed.css'

const MapEmbed = ({ lat, lon, address, zoom = 15, height = 200 }) => {
  const [LeafletComponents, setLeafletComponents] = useState(null);
  const [noMap, setNoMap] = useState(false);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try {
        const rl = await import('react-leaflet');
        await import('leaflet/dist/leaflet.css');
        if (mounted) setLeafletComponents(rl);
      } catch (e) {
        console.warn('react-leaflet not available', e);
        if (mounted) setNoMap(true);
      }
    })();
    return ()=>{ mounted = false }
  },[])

  if (!lat || !lon) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>Location not available</div>

  if (noMap) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#b33'}}>Interactive map not available (install react-leaflet & leaflet)</div>

  if (!LeafletComponents) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center'}}>Loading map...</div>

  const { MapContainer, TileLayer, Marker, Popup } = LeafletComponents;
  return (
    <div className="map-embed" style={{height}}>
      <MapContainer center={[lat, lon]} zoom={zoom} style={{height:'100%', width:'100%'}} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          <Popup>{address || 'Location'}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default MapEmbed
