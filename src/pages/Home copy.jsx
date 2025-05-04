import React, { useRef, useEffect, useState } from 'react'
import mapboxgl                        from 'mapbox-gl'
import MapboxGeocoder                 from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import AddMemoryModal from '../components/AddMemoryModal'

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN
const API            = process.env.REACT_APP_API_URL

export default function Home() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  const [projection, setProjection] = useState('mercator')
  const [pins,       setPins     ] = useState([])
  const [filterText, setFilter   ] = useState('')
  const [modalOpen,  setModal    ] = useState(false)

  // 1) initialize map + search + controls + pins
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style:     'mapbox://styles/mapbox/dark-v10',
      center:    [-122.431297, 37.773972],
      zoom:      1.5,
      projection,
    })
    mapRef.current = map

    // nav controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // —— GLOBAL SEARCH CONTROL ——
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      marker:      false,
      placeholder: 'Search places…',
      //bbox:        [-180, -90, 180, 90], // truly global
      //limit:       10,
      //language:    'en',
    })

    // add it to the map
    map.addControl(geocoder, 'top-left')

    // when the user selects a place, fly there
    geocoder.on('result', ({ result }) => {
      map.flyTo({ center: result.center, zoom: 12 })
    })

    // load pins when map is ready
    map.on('load', loadPins)

    // keep map sized to container
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

    // clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // filter + add new
    pins
      .filter(p =>
        p.memory_name.toLowerCase().includes(filterText.toLowerCase()) ||
        p.place.toLowerCase().includes(filterText.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(filterText.toLowerCase())
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

    // auto-zoom to fit
    const coords = markersRef.current.map(m => m.getLngLat())
    if (coords.length === 1) {
      map.flyTo({ center: coords[0], zoom: 12 })
    } else if (coords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      coords.forEach(c => bounds.extend([c.lng, c.lat]))
      map.fitBounds(bounds, { padding: 40 })
    }
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

      {/* Add Memory CTA */}
      <button
        onClick={() => setModal(true)}
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
        />
      )}
    </div>
  )
}
