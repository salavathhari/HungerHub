import React from 'react'
import './HeroSearch.css'

const HeroSearch = ({ onSearch, onLocation, onSubmit, className = '' }) => {
  const [q, setQ] = React.useState('')
  const [loc, setLoc] = React.useState('')
  const [locLoading, setLocLoading] = React.useState(false)
  const [locError, setLocError] = React.useState('')

  const doSearch = () => {
    if (typeof onSubmit === 'function') return onSubmit(q, loc)
    if (typeof onSearch === 'function') onSearch(q)
    if (typeof onLocation === 'function') onLocation(loc)
  }

  const prevLocRef = React.useRef('')

  const useMyLocation = () => {
    setLocError('')
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported in this browser')
      return
    }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        // Use Nominatim reverse geocoding to extract locality/city
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!resp.ok) throw new Error('Reverse geocode failed')
        const data = await resp.json();
        // try to pick the best locality from the response
        const addr = data && data.address ? data.address : {};
        const locality = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || addr.county || addr.state || '';
        const display = locality || (data && data.display_name) || '';
        if (display) {
          setLoc(display);
          // prefer to call onSubmit when embedding (Navbar passes onSubmit to navigate)
          if (typeof onSubmit === 'function') {
            try { onSubmit(q, display) } catch (e) { /* swallow */ }
          } else if (typeof onLocation === 'function') {
            onLocation(display);
          }
        } else {
          setLocError('Unable to determine locality from coordinates')
        }
      } catch (e) {
        console.warn('useMyLocation error', e);
        setLocError('Failed to reverse-geocode location')
      } finally {
        setLocLoading(false)
      }
    }, (err) => {
      console.warn('geolocation error', err)
      setLocError(err && err.message ? err.message : 'Geolocation error')
      setLocLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  // when the location input transitions from non-empty -> empty, trigger a refresh
  // so clearing the location immediately shows all items (by notifying parent via onSubmit/onLocation)
  React.useEffect(() => {
    const prev = prevLocRef.current || ''
    if (prev && !loc) {
      // transitioned to empty
      if (typeof onSubmit === 'function') {
        try { onSubmit(q, '') } catch (e) { /* swallow */ }
      } else {
        if (typeof onSearch === 'function') onSearch(q)
        if (typeof onLocation === 'function') onLocation('')
      }
    }
    prevLocRef.current = loc
  }, [loc])

  return (
  <section className={`hero-hero ${className ? className : ''}`}>
      <div className="hero-inner app">
        <div className="hero-left">
          <h1 className="hero-title">Craving something delicious?</h1>
          <p className="hero-sub">Discover restaurants, read reviews, and order for delivery or pickup.</p>
          <div className="hero-search-row">
            <input className="hero-search-input" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key === 'Enter') doSearch() }} placeholder="Search for restaurants, dishes or cuisines" />
            <input className="hero-search-input" value={loc} onChange={(e)=>setLoc(e.target.value)} onKeyDown={(e)=>{ if (e.key === 'Enter') doSearch() }} placeholder="Location (city, area)" style={{maxWidth:200}} />
            <button className="btn btn-primary hero-search-btn" onClick={doSearch}>Search</button>
          </div>
          <div style={{marginTop:10, display:'flex', gap:8, alignItems:'center'}}>
            <button className="btn btn-outline" onClick={() => { if (onSubmit) { setLocLoading(true); /* useMyLocation will call onSubmit when ready */ useMyLocation(); } else useMyLocation() }} disabled={locLoading}>{locLoading ? 'Detecting...' : 'Use my location'}</button>
            {locError ? <small style={{color:'var(--danger)'}}>{locError}</small> : null}
          </div>
          <div className="hero-chips">
            <button className="chip" onClick={()=>{ setQ('Biryani'); if (onSubmit) onSubmit('Biryani', loc); else if (onSearch) onSearch('Biryani') }}>Biryani</button>
            <button className="chip" onClick={()=>{ setQ('Pizza'); if (onSubmit) onSubmit('Pizza', loc); else if (onSearch) onSearch('Pizza') }}>Pizza</button>
            <button className="chip" onClick={()=>{ setQ('Sweets'); if (onSubmit) onSubmit('Sweets', loc); else if (onSearch) onSearch('Sweets') }}>Sweets</button>
            <button className="chip" onClick={()=>{ setQ('North Indian'); if (onSubmit) onSubmit('North Indian', loc); else if (onSearch) onSearch('North Indian') }}>North Indian</button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-illustration" aria-hidden>
            {/* Decorative placeholder - keep accessible markup simple */}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSearch
