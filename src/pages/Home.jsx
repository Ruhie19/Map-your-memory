// src/pages/Home.jsx
import React, { useRef, useEffect, useState } from 'react'
import mapboxgl                        from 'mapbox-gl'
import { SearchBox }                  from '@mapbox/search-js-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import AddMemoryModal                 from '../components/AddMemoryModal'

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN
const API            = process.env.REACT_APP_API_URL
const GEOCODE_URL    = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

export default function Home() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  const [projection, setProjection] = useState('mercator')
  const [pins,       setPins     ] = useState([])
  const [filterText, setFilter   ] = useState('')
  const [modalOpen,  setModal    ] = useState(false)

  // store click location & generated place name
  const [clickCoords, setClickCoords] = useState(null)
  const [clickPlace,  setClickPlace ] = useState('')

  // 1) initialize map + controls + pins + click handler
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style:     'mapbox://styles/mapbox/dark-v10',
      center:    [-122.431297, 37.773972],
      zoom:      1.5,
      projection,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('load', loadPins)

    // on map click: reverse‑geocode, store coords/place, open modal
    map.on('click', async e => {
      const { lng, lat } = e.lngLat
      try {
        const res = await fetch(
          `${GEOCODE_URL}/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
        )
        const { features } = await res.json()
        const placeName = features?.[0]?.place_name || ''
        setClickCoords({ lng, lat })
        setClickPlace(placeName)
      } catch (err) {
        console.error('Reverse geocode failed', err)
        setClickCoords({ lng, lat })
        setClickPlace('')
      }
      setModal(true)
    })

    const onResize = () => map.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      markersRef.current.forEach(m => m.remove())
      map.remove()
    }
  }, [projection])

  // 2) redraw markers when pins/filterText/projection change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const ft = filterText.toLowerCase()
    pins
      .filter(p =>
        p.memory_name.toLowerCase().includes(ft) ||
        (p.description  || '').toLowerCase().includes(ft) ||
        (p.prompt_text  || '').toLowerCase().includes(ft)
      )
      .forEach(pin => {
        const color = pin.category_color || '#007AFF'
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="text-align:center; margin-bottom:8px;">
            <img
              src="${API}${pin.file_url}"
              alt="${pin.memory_name}"
              style="max-width:100%; height:auto; border-radius:4px;"
            />
          </div>
          <h3>${pin.memory_name}</h3>
          <p><strong>Place:</strong> ${pin.place}</p>
          ${pin.description ? `<p>${pin.description}</p>` : ''}
          <small>${new Date(pin.memory_date).toLocaleDateString()}</small>
          ${pin.prompt_text ? `<p><em>Prompt:</em> ${pin.prompt_text}</p>` : ''}
        `)
        const marker = new mapboxgl.Marker({ color })
          .setLngLat([pin.longitude, pin.latitude])
          .setPopup(popup)
          .addTo(map)
        markersRef.current.push(marker)
      })

    // auto‑zoom/fly removed
  }, [pins, filterText, projection])

  // 3) globe ↔ mercator toggle
  useEffect(() => {
    const map = mapRef.current
    if (!map?.setProjection) return
    map.setProjection({ name: projection })
    if (projection === 'globe') {
      map.once('style.load', () => map.setFog({}))
    }
  }, [projection])

  // 4) fetch memories from your API
  async function loadPins() {
    try {
      const res  = await fetch(`${API}/memories`)
      const data = await res.json()
      if (!Array.isArray(data)) {
        console.warn('Expected array but got:', data)
        return setPins([])
      }
      setPins(data)
    } catch (err) {
      console.error('Failed to load memories:', err)
    }
  }

  return (
    <div className="relative flex flex-col h-screen bg-[#0F0E0E]">
      <div className="absolute top-4 left-4 z-50 w-72">
        <SearchBox
          accessToken={mapboxgl.accessToken}
          map={mapRef.current}
          mapboxgl={mapboxgl}
          marker={false}
          //flyTo={false}
          placeholder="Search places…"
          //onRetrieve={({ suggestion }) => {
            // if you want to fly on select:
          //  mapRef.current.flyTo({ center: suggestion.center, zoom: 12 })
          //}}
        />
      </div>

      {/* projection switch */}
      <div className="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 space-x-1">
        {['mercator','globe'].map(m => (
          <button
            key={m}
            onClick={() => setProjection(m)}
            className={`px-4 py-2 border ${
              projection === m ? 'bg-gray-700':'bg-black'
            } text-white`}
          >
            {m === 'mercator' ? 'Map' : 'Globe'}
          </button>
        ))}
      </div>

      {/* text filter */}
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        <input
          className="px-3 py-2 rounded"
          placeholder="Filter memories…"
          value={filterText}
          onChange={e => setFilter(e.target.value)}
        />
        <button
          onClick={() => setFilter('')}
          className="px-3 py-2 bg-black text-white border rounded"
        >
          Reset
        </button>
      </div>

      {/* map */}
      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Add Memory CTA (manual) */}
      <button
        onClick={() => {
          setClickCoords(null)
          setClickPlace('')
          setModal(true)
        }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2
                   bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full z-50"
      >
        + Add a Memory
      </button>

      {/* modal */}
      {modalOpen && (
        <AddMemoryModal
          onClose={() => setModal(false)}
          onSave={newPin => {
            setPins(p => [newPin, ...p])
            setModal(false)
          }}
          initialCoords={clickCoords}
          initialPlace={clickPlace}
        />
      )}
    </div>
  )
}
