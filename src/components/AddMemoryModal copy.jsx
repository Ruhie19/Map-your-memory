import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN
const API = process.env.REACT_APP_API_URL

export default function AddMemoryModal({ onClose, onSave }) {
  // form state
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [coords, setCoords] = useState({ lng: null, lat: null })
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('private')

  // prompt state
  const [prompt, setPrompt] = useState(null)
  const [usePrompt, setUsePrompt] = useState(false)

  // ref for geocoder container
  const geoContainer = useRef(null)

  // 1) Mount a standalone search box
  useEffect(() => {
    const container = geoContainer.current
    if (!container) return
    container.innerHTML = ''

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      marker: false,
      placeholder: 'Search location…',
      types: 'address,place,locality,neighborhood,poi,region,country',
      bbox: [-180, -90, 180, 90], // global
      limit: 10,
      language: 'en',
    })

    // listener
    const onResult = ({ result }) => {
      setPlace(result.place_name)
      setCoords({ lng: result.center[0], lat: result.center[1] })
    }

    geocoder.on('result', onResult)
    geocoder.addTo(container)

    // cleanup that exact listener
    return () => {
      geocoder.off('result', onResult)
    }
  }, [])

  // 2) Fetch a random prompt
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API}/prompts/random`)
        if (!res.ok) return
        setPrompt(await res.json())
      } catch (err) {
        console.warn('Could not fetch prompt:', err)
      }
    })()
  }, [])

  // 3) Submit
  const handleSubmit = async e => {
    e.preventDefault()
    if (!name || !file || !date || !place) {
      return alert('Name, file, date & location are required')
    }

    const body = new FormData()
    body.append('memory_name', name)
    body.append('memory_date', date)
    body.append('place', place)
    body.append('latitude', coords.lat)
    body.append('longitude', coords.lng)
    body.append('description', description)
    body.append('visibility', visibility)
    if (usePrompt && prompt) body.append('prompt_id', prompt.prompt_id)
    body.append('file', file)

    try {
      const res = await fetch(`${API}/memories`, { method: 'POST', body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || res.statusText)
      }
      onSave(await res.json())
    } catch (err) {
      console.error(err)
      alert('Upload failed: ' + err.message)
    }
  }

  const refreshPrompt = async () => {
    try {
      const res = await fetch(`${API}/prompts/random`)
      if (!res.ok) return
      setPrompt(await res.json())
    } catch (err) {
      console.warn('Could not fetch prompt:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm mx-4 bg-black border border-white p-5 rounded-lg space-y-4 text-white"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-2xl text-white hover:text-gray-400"
        >
          ×
        </button>

        <h2 className="text-2xl font-semibold text-center">Upload Memory</h2>

        {/* Prompt bar */}
        {prompt && (
          <div className="space-y-2">
            <label className="text-base font-medium text-white">
              Get a Prompt
            </label>
            <div className="flex items-center bg-neutral-900 rounded-md p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-gray-400 flex-shrink-0"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="flex-1 mx-2 text-white italic text-sm">
                "{prompt.prompt_text}"
              </span>
              <button
                type="button"
                onClick={refreshPrompt}
                className="p-1 text-gray-400 hover:text-white focus:outline-none flex-shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582M20 20v-5h-.581M5.21 9
                       a7.492 7.492 0 0110.58-2.089
                       M18.79 15a7.492 7.492 0
                       01-10.58 2.089"
                  />
                </svg>
              </button>
            </div>
            <label className="inline-flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={usePrompt}
                onChange={e => setUsePrompt(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="ml-2 text-sm">Use this prompt</span>
            </label>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1">
          <label className="text-base text-white">Name of Memory</label>
          <input
            required
            type="text"
            placeholder="Name of Memory"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-2 rounded-md bg-neutral-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* File */}
        <div className="space-y-1">
          <label className="text-base text-white">Upload Memory</label>
          <div className="w-full p-3 rounded-md bg-neutral-900 border border-neutral-800 text-center">
            <p className="text-gray-400 text-sm mb-2">This can be pictures, videos, audio narrations</p>
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-gray-400 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
                <span className="text-gray-400 text-sm">Upload or Drop Files</span>
              </div>
              <input
                required
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={e => setFile(e.target.files[0])}
                className="hidden"
              />
              {file && (
                <div className="mt-2 text-blue-500 text-xs">
                  {file.name}
                </div>
              )}
              {!file && (
                <div className="mt-2 text-gray-500 text-xs">
                  No file chosen
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-base text-white">Timeline of Memory</label>
          <div className="relative">
            <input
              required
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-2 rounded-md bg-neutral-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="text-base text-white">
            Location where the memory lives
          </label>
          <div
            ref={geoContainer}
            className="w-full"
            style={{ minHeight: '38px' }}
          />
          {!place && (
            <p className="text-red-500 text-xs mt-1">Select a place</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-base text-white">Describe your memory</label>
          <textarea
            placeholder="Describe your memory (optional)"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-2 rounded-md bg-neutral-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="text-base text-white">Share Memory</label>
          <div className="flex items-center space-x-6 mt-1">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-2 text-white text-sm">Private</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-2 text-white text-sm">Public</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-2 mt-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium"
        >
          Submit
        </button>
      </form>
    </div>
  )
}