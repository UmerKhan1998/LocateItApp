"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import saudimap from "../public/saudimap.jpg";

export default function Page() {
  const mapRef = useRef(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [hoveredCity, setHoveredCity] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const locationMapArr = [
    {
      cityName: "Riyadh",
      lat: 24.7136,
      lng: 46.6753,
      description: "Capital of Saudi Arabia, known for its modern skyline.",
    },
    {
      cityName: "Makkah",
      lat: 21.3891,
      lng: 39.8579,
      description: "The holiest city in Islam, home to the Kaaba.",
    },
    {
      cityName: "Jeddah",
      lat: 21.5431,
      lng: 39.2009,
      description: "The second largest city in Saudi Arabia, known for its beaches.",
    },
    {
      cityName: "Mecca",
      lat: 21.4228,
      lng: 39.8262,
      description: "The holy city of Islam, home to the Masjid al-Haram.",
    },
    {
      cityName: "Dammam",
      lat: 26.3546,
      lng: 49.8025,
      description: "The third largest city in Saudi Arabia, known for its oil industry.",
    },
    {
      cityName: "Tabuk",
      lat: 28.3872,
      lng: 36.6084,
      description: "Known for its desert landscapes, Tabuk is a popular tourist destination.",
    },
    {
      cityName: "Taif",
      lat: 21.3333,
      lng: 40.4167,
      description: "Known for its old city walls and historical sites, Taif is a popular tourist destination.",
    },
    {
      cityName: "Medina",
      lat: 24.5247,
      lng: 39.5692,
      description: "Second holiest city, location of the Prophet’s Mosque.",
    },
  ];

  // Approx Saudi bounding box (adjust if needed)
  const bounds = {
    minLat: 15.5,
    maxLat: 32.5,
    minLng: 33,
    maxLng: 57,
  };

  // Update map size dynamically
  useEffect(() => {
    const updateSize = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        setMapSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Convert lat/lng → pixel coordinates
  const getPosition = (lat:any, lng:any) => {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const x = ((lng - minLng) / (maxLng - minLng)) * mapSize.width;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * mapSize.height;
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-4xl font-bold">Locate It</div>

      <div
        ref={mapRef}
        className="relative w-full max-w-[500px] aspect-[1/1] border border-border rounded-lg overflow-hidden shadow-lg"
      >
        <Image src={saudimap} alt="Saudi Map" fill className="object-contain" />

        {mapSize.width > 0 &&
          locationMapArr.map((loc, index) => {
            const { x, y } = getPosition(loc.lat, loc.lng);

            return (
              <div
                key={index}
                className="absolute"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseEnter={() => setHoveredCity(loc)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => setSelectedCity(loc)}
              >
                {/* City Marker */}
                <motion.div
                  className="w-4 h-4 bg-red-600 rounded-full shadow-md cursor-pointer border-2 border-white"
                  whileHover={{ scale: 1.3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              </div>
            );
          })}

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredCity && (
            <motion.div
              key={hoveredCity.cityName}
              className="absolute bg-white text-black text-sm px-3 py-1 rounded-md shadow-lg"
              style={{
                left: `${getPosition(hoveredCity.lat, hoveredCity.lng).x}px`,
                top: `${getPosition(hoveredCity.lat, hoveredCity.lng).y - 25}px`,
                transform: "translate(-50%, -100%)",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {hoveredCity.cityName}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click Info Card */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            className="mt-6 w-full max-w-[400px] bg-white text-black rounded-lg p-4 shadow-md border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold">{selectedCity.cityName}</h3>
              <button
                className="text-gray-500 hover:text-black"
                onClick={() => setSelectedCity(null)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm">{selectedCity.lat} {selectedCity.lng}</p>
            <p className="text-sm">{selectedCity.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
