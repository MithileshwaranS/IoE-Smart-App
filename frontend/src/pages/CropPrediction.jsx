import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wheat,
  TrendingUp,
  Calendar,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import toast from "react-hot-toast";

// Helper function to normalize strings for matching
const normalizeString = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " "); // Normalize whitespace
};

// Calculate string similarity using Levenshtein distance
const stringSimilarity = (str1, str2) => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Simple Levenshtein distance calculation
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
};

// Find the best matching state from the list
const findMatchingState = (detectedState) => {
  if (!detectedState) return null;

  const normalizedDetected = normalizeString(detectedState);
  const states = Object.keys(STATE_DISTRICT_MAP);

  // Try exact match first
  for (const state of states) {
    if (normalizeString(state) === normalizedDetected) {
      return state;
    }
  }

  // Try partial match
  for (const state of states) {
    const normalizedState = normalizeString(state);
    if (
      normalizedDetected.includes(normalizedState) ||
      normalizedState.includes(normalizedDetected)
    ) {
      return state;
    }
  }

  // Use similarity matching
  let bestMatch = null;
  let bestScore = 0;

  for (const state of states) {
    const score = stringSimilarity(detectedState, state);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = state;
    }
  }

  return bestMatch;
};

// Find the best matching district within a state
const findMatchingDistrict = (detectedDistrict, state) => {
  if (!detectedDistrict || !state || !STATE_DISTRICT_MAP[state]) {
    return null;
  }

  const normalizedDetected = normalizeString(detectedDistrict);
  const districts = STATE_DISTRICT_MAP[state];

  // Try exact match first
  for (const district of districts) {
    if (normalizeString(district) === normalizedDetected) {
      return district;
    }
  }

  // Try partial match
  for (const district of districts) {
    const normalizedDistrict = normalizeString(district);
    if (
      normalizedDetected.includes(normalizedDistrict) ||
      normalizedDistrict.includes(normalizedDetected)
    ) {
      return district;
    }
  }

  // Use similarity matching
  let bestMatch = null;
  let bestScore = 0;

  for (const district of districts) {
    const score = stringSimilarity(detectedDistrict, district);
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = district;
    }
  }

  return bestMatch;
};

// State-District Mapping Data
const STATE_DISTRICT_MAP = {
  "arunachal pradesh": [
    "anjaw",
    "changlang",
    "dibang valley",
    "east kameng",
    "east siang",
    "kurung kumey",
    "lohit",
    "longding",
    "lower dibang valley",
    "lower subansiri",
    "papum pare",
    "tawang",
    "tirap",
    "upper siang",
    "upper subansiri",
    "west kameng",
    "west siang",
  ],
  bihar: [
    "araria",
    "arwal",
    "aurangabad",
    "banka",
    "begusarai",
    "bhagalpur",
    "bhojpur",
    "buxar",
    "darbhanga",
    "gaya",
    "gopalganj",
    "jamui",
    "jehanabad",
    "kaimur (bhabua)",
    "katihar",
    "khagaria",
    "kishanganj",
    "lakhisarai",
    "madhepura",
    "madhubani",
    "munger",
    "muzaffarpur",
    "nalanda",
    "nawada",
    "pashchim champaran",
    "patna",
    "purbi champaran",
    "purnia",
    "rohtas",
    "saharsa",
    "samastipur",
    "saran",
    "sheikhpura",
    "sheohar",
    "sitamarhi",
    "siwan",
    "supaul",
    "vaishali",
  ],
  chhattisgarh: [
    "balod",
    "baloda bazar",
    "balrampur",
    "bastar",
    "bemetara",
    "bijapur",
    "bilaspur",
    "dantewada",
    "dhamtari",
    "durg",
    "gariyaband",
    "janjgir-champa",
    "jashpur",
    "kabirdham",
    "kanker",
    "kondagaon",
    "korba",
    "korea",
    "mahasamund",
    "mungeli",
    "narayanpur",
    "raigarh",
    "raipur",
    "rajnandgaon",
    "sukma",
    "surajpur",
    "surguja",
  ],
  "himachal pradesh": [
    "bilaspur",
    "chamba",
    "hamirpur",
    "kangra",
    "kinnaur",
    "kullu",
    "lahul and spiti",
    "mandi",
    "shimla",
    "sirmaur",
    "solan",
    "una",
  ],
  jharkhand: [
    "bokaro",
    "chatra",
    "deoghar",
    "dhanbad",
    "dumka",
    "east singhbum",
    "garhwa",
    "giridih",
    "godda",
    "gumla",
    "hazaribagh",
    "jamtara",
    "khunti",
    "koderma",
    "latehar",
    "lohardaga",
    "pakur",
    "palamu",
    "ramgarh",
    "ranchi",
    "sahebganj",
    "saraikela kharsawan",
    "simdega",
    "west singhbhum",
  ],
  kerala: [
    "alappuzha",
    "ernakulam",
    "idukki",
    "kannur",
    "kasaragod",
    "kollam",
    "kottayam",
    "kozhikode",
    "malappuram",
    "palakkad",
    "pathanamthitta",
    "thiruvananthapuram",
    "thrissur",
    "wayanad",
  ],
  odisha: [
    "anugul",
    "balangir",
    "baleshwar",
    "bargarh",
    "bhadrak",
    "boudh",
    "cuttack",
    "deogarh",
    "dhenkanal",
    "gajapati",
    "ganjam",
    "jagatsinghapur",
    "jajapur",
    "jharsuguda",
    "kalahandi",
    "kandhamal",
    "kendrapara",
    "kendujhar",
    "khordha",
    "koraput",
    "malkangiri",
    "mayurbhanj",
    "nabarangpur",
    "nayagarh",
    "nuapada",
    "puri",
    "rayagada",
    "sambalpur",
    "sonepur",
    "sundargarh",
  ],
  punjab: [
    "amritsar",
    "barnala",
    "bathinda",
    "faridkot",
    "fatehgarh sahib",
    "fazilka",
    "gurdaspur",
    "hoshiarpur",
    "jalandhar",
    "kapurthala",
    "ludhiana",
    "mansa",
    "moga",
    "pathankot",
    "patiala",
    "rupnagar",
    "s.a.s nagar",
    "sangrur",
    "tarn taran",
  ],
  "tamil nadu": [
    "ariyalur",
    "coimbatore",
    "cuddalore",
    "dharmapuri",
    "dindigul",
    "erode",
    "kanchipuram",
    "kanniyakumari",
    "karur",
    "krishnagiri",
    "madurai",
    "nagapattinam",
    "namakkal",
    "perambalur",
    "pudukkottai",
    "ramanathapuram",
    "salem",
    "sivaganga",
    "thanjavur",
    "the nilgiris",
    "theni",
    "thiruvallur",
    "thiruvarur",
    "tiruchirappalli",
    "tirunelveli",
    "tiruppur",
    "tiruvannamalai",
    "tuticorin",
    "vellore",
    "villupuram",
    "virudhunagar",
  ],
  uttarakhand: [
    "almora",
    "bageshwar",
    "chamoli",
    "champawat",
    "dehradun",
    "haridwar",
    "nainital",
    "pauri garhwal",
    "pithoragarh",
    "rudra prayag",
    "tehri garhwal",
    "udam singh nagar",
    "uttar kashi",
  ],
};

const CropPrediction = () => {
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [predictionData, setPredictionData] = useState({
    yield: "4.2 tons/hectare",
    confidence: "92%",
    harvestDate: "2024-09-15",
    recommendation: "Excellent conditions for high yield",
  });

  // User input states (state/district will be populated via GPS)
  const [userState, setUserState] = useState("");
  const [district, setDistrict] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [season, setSeason] = useState("Rabi");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [area, setArea] = useState("");

  // MQTT and environmental data states
  const [mqttConnected, setMqttConnected] = useState(false);
  const [mqttError, setMqttError] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState({
    temperature: "24°C",
    humidity: "65%",
    rainfall: "45mm",
    nitrogen: "240 kg/ha",
    phosphorous: "80 kg/ha",
    potassium: "120 kg/ha",
    solarRadiation: "18 MJ/m²",
    soilMoisture: "28%",
    windSpeed: "12 m/s",
  });

  // Raw environmental data values (for API calls)
  const [rawEnvironmentalData, setRawEnvironmentalData] = useState({
    temperature_c: 24,
    humidity: 65,
    rainfall_mm: 45,
    n_avg: 240,
    p_avg: 80,
    k_avg: 120,
    solar_radiation: 18,
    soil_moisture: 0.28,
    wind_speed: 12,
  });

  const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // If env is set and not localhost, prefer it (for real production domains)
    if (envUrl && !envUrl.includes("localhost")) {
      return envUrl;
    }
    // Fallback: same host as the frontend, but backend port 3001
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  };

  const BASE_URL = getApiBaseUrl();

  // Loading state for prediction
  const [predicting, setPredicting] = useState(false);
  // console.log(selectedCrop);

  // MQTT Subscription Setup via WebSocket Bridge
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isMounted = true;

    const connect = () => {
      // Connect to WebSocket bridge (backend bridges MQTT to WebSocket)
      const envWs = import.meta.env.VITE_WS_BASE_URL;
      const envApi = import.meta.env.VITE_API_BASE_URL;

      let wsBase;
      if (envWs && !envWs.includes("localhost")) {
        wsBase = envWs;
      } else if (envApi && !envApi.includes("localhost")) {
        wsBase = envApi.replace(/^http/, "ws");
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsBase = `${protocol}//${window.location.hostname}:3001`;
      }

      ws = new WebSocket(`${wsBase}/mqtt`);

      ws.onopen = () => {
        console.log("WebSocket connected to MQTT bridge");
        if (isMounted) {
          setMqttConnected(true);
          setMqttError(null);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received MQTT data:", data);

          if (isMounted) {
            // Update raw data for API calls
            setRawEnvironmentalData({
              temperature_c: data.temperature_c || 24,
              humidity: data.humidity || 65,
              rainfall_mm: data.rainfall_mm || 45,
              n_avg: data.n_avg || 240,
              p_avg: data.p_avg || 80,
              k_avg: data.k_avg || 120,
              solar_radiation: data.solar_radiation || 18,
              soil_moisture: data.soil_moisture || 0.28,
              wind_speed: data.wind_speed || 12,
            });

            // Update formatted environmental data state for display
            setEnvironmentalData({
              temperature: `${data.temperature_c?.toFixed(1) || "24"}°C`,
              humidity: `${data.humidity?.toFixed(1) || "65"}%`,
              rainfall: `${data.rainfall_mm?.toFixed(2) || "45"}mm`,
              nitrogen: `${data.n_avg?.toFixed(2) || "240"} kg/ha`,
              phosphorous: `${data.p_avg?.toFixed(2) || "80"} kg/ha`,
              potassium: `${data.k_avg?.toFixed(2) || "120"} kg/ha`,
              solarRadiation: `${
                data.solar_radiation?.toFixed(2) || "18"
              } MJ/m²`,
              soilMoisture: `${((data.soil_moisture || 0.28) * 100).toFixed(
                1
              )}%`,
              windSpeed: `${data.wind_speed?.toFixed(2) || "12"} m/s`,
            });
          }
        } catch (error) {
          console.error("Error parsing MQTT message:", error);
          if (isMounted) {
            setMqttError("Failed to parse MQTT message");
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (isMounted) {
          setMqttError(
            "WebSocket connection error. Make sure backend server is running."
          );
          setMqttConnected(false);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        if (isMounted) {
          setMqttConnected(false);
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              console.log("Attempting to reconnect...");
              connect();
            }
          }, 3000);
        }
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Attempt to auto-detect location on mount
  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!navigator || !navigator.geolocation) {
        setLocationError("Geolocation not supported");
        return;
      }
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
            );
            const j = await resp.json();
            const addr = j.address || {};
            const detectedState =
              addr.state || addr.region || addr.county || "";
            const detectedDistrict =
              addr.county ||
              addr.state_district ||
              addr.city_district ||
              addr.town ||
              addr.village ||
              "";

            if (!cancelled) {
              // Map detected location to nearest state from the list
              const matchedState = findMatchingState(detectedState);

              if (matchedState) {
                setUserState(matchedState);

                // Map detected district to nearest district within the matched state
                const matchedDistrict = findMatchingDistrict(
                  detectedDistrict,
                  matchedState
                );

                if (matchedDistrict) {
                  setDistrict(matchedDistrict);
                } else {
                  // If no district match found, leave it empty for user to select
                  setDistrict("");
                }
                setLocationError(null);
              } else {
                // If no state match found, leave both empty
                setUserState("");
                setDistrict("");
                setLocationError(
                  `Location detected: ${detectedState}, but not found in our list. Please select manually.`
                );
              }
            }
          } catch (e) {
            if (!cancelled)
              setLocationError("Failed to reverse-geocode location");
          } finally {
            if (!cancelled) setLocationLoading(false);
          }
        },
        (err) => {
          if (!cancelled) {
            setLocationError(err.message || "Location permission denied");
            setLocationLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const crops = [
    { id: "wheat", name: "Wheat", icon: "🌾" },
    { id: "corn", name: "Corn", icon: "🌽" },
    { id: "rice", name: "Rice", icon: "🌾" },
    // { id: "tomato", name: "Tomato", icon: "🍅" },
  ];

  const environmentalFactors = [
    {
      label: "Temperature",
      value: environmentalData.temperature,
      icon: Thermometer,
      color: "text-orange-600",
    },
    {
      label: "Humidity",
      value: environmentalData.humidity,
      icon: Droplets,
      color: "text-blue-600",
    },
    {
      label: "Rainfall",
      value: environmentalData.rainfall,
      icon: Droplets,
      color: "text-cyan-600",
    },
    {
      label: "Nitrogen",
      value: environmentalData.nitrogen,
      icon: MapPin,
      color: "text-purple-600",
    },
    {
      label: "Phosphorous",
      value: environmentalData.phosphorous,
      icon: MapPin,
      color: "text-pink-600",
    },
    {
      label: "Potassium",
      value: environmentalData.potassium,
      icon: MapPin,
      color: "text-red-600",
    },
    {
      label: "Solar Radiation",
      value: environmentalData.solarRadiation,
      icon: Thermometer,
      color: "text-yellow-600",
    },
    {
      label: "Soil Moisture",
      value: environmentalData.soilMoisture,
      icon: Droplets,
      color: "text-teal-600",
    },
    {
      label: "Wind Speed",
      value: environmentalData.windSpeed,
      icon: Wind,
      color: "text-indigo-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <Wheat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Crop Yield Prediction
            </h1>
            <p className="text-gray-500">AI-powered yield forecasting</p>
          </div>
        </div>
      </div>

      {/* Crop Selection */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Select Crop Type
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {crops.map((crop) => (
            <motion.button
              key={crop.id}
              onClick={() => setSelectedCrop(crop.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full h-full p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center ${
                selectedCrop === crop.id
                  ? "border-green-500 bg-green-50 shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl sm:text-3xl mb-2">{crop.icon}</div>
              <p className="font-medium text-gray-800 text-sm sm:text-base">
                {crop.name}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* User Inputs */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Inputs</h2>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            Detecting location will autofill State & District
          </div>
          <div>
            {locationLoading ? (
              <span className="text-sm text-gray-500">
                Detecting location...
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // trigger location detection again
                  setLocationError(null);
                  setLocationLoading(true);
                  if (navigator && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        try {
                          const lat = pos.coords.latitude;
                          const lon = pos.coords.longitude;
                          const resp = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
                          );
                          const j = await resp.json();
                          const addr = j.address || {};
                          const detectedState =
                            addr.state || addr.region || addr.county || "";
                          const detectedDistrict =
                            addr.county ||
                            addr.state_district ||
                            addr.city_district ||
                            addr.town ||
                            addr.village ||
                            "";

                          // Map detected location to nearest state from the list
                          const matchedState = findMatchingState(detectedState);

                          if (matchedState) {
                            setUserState(matchedState);

                            // Map detected district to nearest district within the matched state
                            const matchedDistrict = findMatchingDistrict(
                              detectedDistrict,
                              matchedState
                            );

                            if (matchedDistrict) {
                              setDistrict(matchedDistrict);
                            } else {
                              // If no district match found, leave it empty for user to select
                              setDistrict("");
                            }
                            setLocationError(null);
                          } else {
                            // If no state match found, leave both empty
                            setUserState("");
                            setDistrict("");
                            setLocationError(
                              `Location detected: ${detectedState}, but not found in our list. Please select manually.`
                            );
                          }
                        } catch (e) {
                          setLocationError(
                            "Failed to reverse-geocode location"
                          );
                        } finally {
                          setLocationLoading(false);
                        }
                      },
                      (err) => {
                        setLocationError(
                          err.message || "Location permission denied"
                        );
                        setLocationLoading(false);
                      },
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  } else {
                    setLocationError("Geolocation not supported");
                    setLocationLoading(false);
                  }
                }}
                className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-md border"
              >
                Retry Location
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">State</label>
            <select
              value={userState}
              onChange={(e) => {
                setUserState(e.target.value);
                setDistrict(""); // Reset district when state changes
              }}
              className="w-full border p-2 rounded-md"
            >
              <option value="">Select State</option>
              {Object.keys(STATE_DISTRICT_MAP).map((state) => (
                <option key={state} value={state}>
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!userState}
              className="w-full border p-2 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {userState ? "Select District" : "Select State First"}
              </option>
              {userState &&
                STATE_DISTRICT_MAP[userState].map((dist) => (
                  <option key={dist} value={dist}>
                    {dist.charAt(0).toUpperCase() + dist.slice(1)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border p-2 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value; // YYYY-MM
                setSelectedMonth(val);
                if (val && val.length === 7) {
                  const [y, m] = val.split("-");
                  const monthNum = Number(m); // 1-12
                  setYear(Number(y));
                  // determine season
                  const seasonFromMonth = (() => {
                    if (monthNum >= 6 && monthNum <= 9) return "Kharif";
                    if (monthNum >= 4 && monthNum <= 5) return "Zaid";
                    // Oct(10)-Dec(12) and Jan(1)-Mar(3) as Rabi
                    return "Rabi";
                  })();
                  setSeason(seasonFromMonth);
                }
              }}
              className="w-full border p-2 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full border p-2 rounded-md"
            >
              <option>Rabi</option>
              <option>Kharif</option>
              <option>Zaid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Area (ha)
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full border p-2 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Environmental Factors */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Environmental Factors
          </h2>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                mqttConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-xs text-gray-500">
              {mqttConnected ? "MQTT Connected" : "MQTT Disconnected"}
            </span>
          </div>
        </div>
        {mqttError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {mqttError}
          </div>
        )}
        <div className="space-y-4">
          {environmentalFactors.map((factor, index) => {
            const Icon = factor.icon;
            return (
              <motion.div
                key={factor.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-6 h-6 ${factor.color}`} />
                  <span className="text-gray-700">{factor.label}</span>
                </div>
                <span className="font-semibold text-gray-800">
                  {factor.value}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Prediction Results */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Prediction Results
        </h2>
        <div className="flex items-center justify-center p-8 bg-green-50 rounded-xl">
          <div className="flex items-center space-x-4">
            <TrendingUp className="w-12 h-12 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Expected Yield</p>
              <p className="text-4xl font-bold text-green-600">
                {predictionData.yield}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button
          onClick={async () => {
            // Validate required fields
            if (!userState || !district) {
              toast.error("Please select State and District");
              return;
            }
            if (!area || parseFloat(area) <= 0) {
              toast.error("Please enter a valid area (in hectares)");
              return;
            }

            setPredicting(true);
            const loadingToast = toast.loading("Predicting yield...");

            try {
              // Prepare payload with all data
              const payload = {
                state: userState,
                district: district,
                year: year,
                season: season,
                crop: selectedCrop,
                area: parseFloat(area),
                ...rawEnvironmentalData,
              };

              const response = await fetch(
                `${BASE_URL}/api/crop-yield/predict`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.error || data.details || "Prediction failed"
                );
              }

              if (data.success) {
                setPredictionData({
                  yield:
                    data.formatted_yield ||
                    `${data.predicted_yield?.toFixed(2) || "0"} tons/hectare`,
                  confidence: "N/A",
                  harvestDate: "N/A",
                  recommendation: `Predicted yield based on current environmental conditions`,
                });
                toast.success("Yield prediction completed!", {
                  id: loadingToast,
                });
              } else {
                throw new Error(data.error || "Prediction failed");
              }
            } catch (error) {
              console.error("Prediction error:", error);
              toast.error(`Error: ${error.message}`, { id: loadingToast });
            } finally {
              setPredicting(false);
            }
          }}
          disabled={predicting}
          whileHover={predicting ? {} : { scale: 1.05 }}
          whileTap={predicting ? {} : { scale: 0.95 }}
          className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 ${
            predicting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {predicting ? "Predicting..." : "Predict Yield"}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CropPrediction;
