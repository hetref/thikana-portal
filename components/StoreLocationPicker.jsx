"use client";
import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import Select from "react-select";

const defaultCenter = { lat: 28.6139, lng: 77.209 }; // Default (Delhi)

export default function StoreLocationPicker({ onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState(defaultCenter);
  const [address, setAddress] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Handle map click to select a location
  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setSelectedLocation({ lat, lng });
        fetchAddress(lat, lng);
        onLocationSelect({ lat, lng });
      },
    });

    return <Marker position={selectedLocation} />;
  }

  // Fetch Address using GoMaps.pro Reverse Geocoding
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://api.gomaps.pro/geocode/reverse?lat=${lat}&lon=${lng}&apikey=AlzaSy0ZX6J8gbg9HzXotw8vmTMxDG66makE6jo`
      );
      setAddress(res.data.display_name || "Address not found");
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  // Handle location search
  const handleSearch = async (input) => {
    if (!input) return;
    try {
      const res = await axios.get(
        `https://api.gomaps.pro/geocode/search?q=${input}&apikey=AlzaSy0ZX6J8gbg9HzXotw8vmTMxDG66makE6jo`
      );
      const results = res.data.features.map((place) => ({
        label: place.properties.display_name,
        value: {
          lat: place.geometry.coordinates[1],
          lng: place.geometry.coordinates[0],
        },
      }));
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching location:", error);
    }
  };

  // Handle location selection from search
  const handleSelect = (option) => {
    if (option) {
      setSelectedOption(option);
      setSelectedLocation(option.value);
      fetchAddress(option.value.lat, option.value.lng);
      onLocationSelect(option.value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Select
        options={searchResults}
        onInputChange={handleSearch}
        onChange={handleSelect}
        placeholder="Search for a location..."
        isClearable
      />

      {/* Map */}
      <MapContainer
        center={selectedLocation}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker />
      </MapContainer>

      {/* Display Selected Location Info */}
      <p>Selected Address: {address}</p>
      <p>
        Coordinates: {selectedLocation.lat}, {selectedLocation.lng}
      </p>
    </div>
  );
}
