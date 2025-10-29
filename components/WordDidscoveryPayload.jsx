import React, { useEffect, useState } from "react";

const WordDiscoveryPayload = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          "https://mqj-dev-9e61eb3bc492.herokuapp.com/api/activity/WordDiscovery/getById?surahId=66dab1bfea8d5e87888309a5",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer " +
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTRkZTY5NzQ4MzAwZjgwNmQyYjg0NyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MTYzMTM5OSwiZXhwIjo0ODg1ODMzNzk5fQ.qSuWC4o0sQmUaBmFItZIPcUc2r5MwzeYlki9mdHzk4Q",
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch data");

        const json = await res.json();
        setData(json);
        console.log("Fetched data:", json);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Safely compute matrix with coordinates
  const matrixWithCoords = data?.data?.matrix?.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      r: rowIndex,
      c: colIndex,
      ...cell,
    }))
  );

  console.log("matrixWithCoords", matrixWithCoords);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Word Discovery Payload</h2>
      <pre>{JSON.stringify(matrixWithCoords, null, 2)}</pre>
    </div>
  );
};

export default WordDiscoveryPayload;
