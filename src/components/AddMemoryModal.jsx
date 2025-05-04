// src/components/AddMemoryModal.jsx
import React, { useEffect, useState } from 'react'
import mapboxgl                         from 'mapbox-gl'
import { SearchBox }                   from '@mapbox/search-js-react'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN
const API = process.env.REACT_APP_API_URL

export default function AddMemoryModal({
  onClose,
  onSave,
  initialCoords = null,
  initialPlace  = ''
}) {
  // form state (prefilled from props if provided)
  const [name,        setName       ] = useState('')
  const [file,        setFile       ] = useState(null)
  const [date,        setDate       ] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [place,       setPlace      ] = useState(initialPlace)
  const [coords,      setCoords     ] = useState(
    initialCoords || { lng: null, lat: null }
  )
  const [description, setDescription] = useState('')
  const [visibility,  setVisibility ] = useState('private')

  // prompt state
  const [prompt,    setPrompt  ] = useState(null)
  const [usePrompt, setUsePrompt] = useState(false)

  // fetch a random prompt
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

  // submit handler
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
      const res = await fetch(`${API}/memories`, {
        method: 'POST',
        body
      })
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
            <label className="text-base font-medium text-white">Get a Prompt</label>
            <div className="flex items-center bg-neutral-900 rounded-md p-3">
              <span className="flex-1 mx-2 text-white italic text-sm">
                "{prompt.prompt_text}"
              </span>
              <button
                type="button"
                onClick={refreshPrompt}
                className="p-1 text-gray-400 hover:text-white flex-shrink-0"
              >
                🔄
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

        {/* File upload */}
        <div className="space-y-1">
          <label className="text-base text-white">Upload Memory</label>
          <div className="w-full p-3 rounded-md bg-neutral-900 border border-neutral-800 text-center">
            <p className="text-gray-400 text-sm mb-2">
              This can be pictures, videos, audio narrations
            </p>
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <span className="text-gray-400 text-sm">Upload or Drop Files</span>
              <input
                required
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={e => setFile(e.target.files[0])}
                className="hidden"
              />
              {file ? (
                <div className="mt-2 text-blue-500 text-xs">{file.name}</div>
              ) : (
                <div className="mt-2 text-gray-500 text-xs">No file chosen</div>
              )}
            </label>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-base text-white">Timeline of Memory</label>
          <input
            required
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-2 rounded-md bg-neutral-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Location (SearchBox + readOnly field) */}
        <div className="space-y-1">
          <label className="text-base text-white">
            Location where the memory lives
          </label>
          <SearchBox
            accessToken={mapboxgl.accessToken}
            placeholder="Search location…"
            onRetrieve={res => {
              const feat = res.features[0]
              setPlace(
                feat.properties.full_address ||
                feat.properties.place_formatted
              )
              setCoords({
                lng: feat.geometry.coordinates[0],
                lat: feat.geometry.coordinates[1]
              })
            }}
            flyTo={false}
          />
          <input
            type="text"
            value={place}
            readOnly
            placeholder="Click on map or use search above"
            className="w-full p-2 rounded-md bg-neutral-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
