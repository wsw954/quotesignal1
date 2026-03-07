//components/intake/VehicleSelector.js
"use client";

import { useEffect, useRef, useState } from "react";

export default function VehicleSelector({ form, setForm }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);

  const [error, setError] = useState("");

  const modelsRequestRef = useRef(0);
  const trimsRequestRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function loadMakes() {
      try {
        setLoadingMakes(true);
        setError("");

        const response = await fetch("/api/vehicle/makes");
        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to load makes.");
        }

        if (isMounted) {
          setMakes(Array.isArray(result.data) ? result.data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load makes.");
        }
      } finally {
        if (isMounted) {
          setLoadingMakes(false);
        }
      }
    }

    loadMakes();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleMakeChange(event) {
    const nextMakeId = event.target.value;
    const selectedMake = makes.find((item) => item.id === nextMakeId);

    // non-negotiable: clear model + trim immediately
    setForm((prev) => ({
      ...prev,
      makeId: nextMakeId,
      makeName: selectedMake?.name || "",
      modelId: "",
      modelName: "",
      trimId: "",
      trimName: "",
    }));

    setModels([]);
    setTrims([]);
    setError("");

    if (!nextMakeId) {
      return;
    }

    const requestId = ++modelsRequestRef.current;

    try {
      setLoadingModels(true);

      const response = await fetch(
        `/api/vehicle/models?makeId=${encodeURIComponent(nextMakeId)}`,
      );
      const result = await response.json();

      if (requestId !== modelsRequestRef.current) {
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to load models.");
      }

      setModels(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      if (requestId === modelsRequestRef.current) {
        setError(err.message || "Failed to load models.");
      }
    } finally {
      if (requestId === modelsRequestRef.current) {
        setLoadingModels(false);
      }
    }
  }

  async function handleModelChange(event) {
    const nextModelId = event.target.value;
    const selectedModel = models.find((item) => item.id === nextModelId);

    // non-negotiable: clear trim immediately
    setForm((prev) => ({
      ...prev,
      modelId: nextModelId,
      modelName: selectedModel?.name || "",
      trimId: "",
      trimName: "",
    }));

    setTrims([]);
    setError("");

    if (!nextModelId) {
      return;
    }

    const requestId = ++trimsRequestRef.current;

    try {
      setLoadingTrims(true);

      const response = await fetch(
        `/api/vehicle/trims?modelId=${encodeURIComponent(nextModelId)}`,
      );
      const result = await response.json();

      if (requestId !== trimsRequestRef.current) {
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to load trims.");
      }

      setTrims(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      if (requestId === trimsRequestRef.current) {
        setError(err.message || "Failed to load trims.");
      }
    } finally {
      if (requestId === trimsRequestRef.current) {
        setLoadingTrims(false);
      }
    }
  }

  function handleTrimChange(event) {
    const nextTrimId = event.target.value;
    const selectedTrim = trims.find((item) => item.id === nextTrimId);

    setForm((prev) => ({
      ...prev,
      trimId: nextTrimId,
      trimName: selectedTrim?.name || "",
    }));
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Vehicle Selection</h2>
        <p className="mt-1 text-sm text-gray-600">
          Select make, model, and trim in order.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="makeId" className="block text-sm font-medium">
            Make
          </label>
          <select
            id="makeId"
            name="makeId"
            value={form.makeId}
            onChange={handleMakeChange}
            disabled={loadingMakes}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">
              {loadingMakes ? "Loading makes..." : "Select make"}
            </option>
            {makes.map((make) => (
              <option key={make.id} value={make.id}>
                {make.name}
              </option>
            ))}
          </select>
          {!loadingMakes && makes.length === 0 ? (
            <p className="text-xs text-gray-500">No makes found.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="modelId" className="block text-sm font-medium">
            Model
          </label>
          <select
            id="modelId"
            name="modelId"
            value={form.modelId}
            onChange={handleModelChange}
            disabled={!form.makeId || loadingModels}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">
              {!form.makeId
                ? "Select make first"
                : loadingModels
                  ? "Loading models..."
                  : "Select model"}
            </option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          {form.makeId && !loadingModels && models.length === 0 ? (
            <p className="text-xs text-gray-500">No models found.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="trimId" className="block text-sm font-medium">
            Trim
          </label>
          <select
            id="trimId"
            name="trimId"
            value={form.trimId}
            onChange={handleTrimChange}
            disabled={!form.modelId || loadingTrims}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">
              {!form.modelId
                ? "Select model first"
                : loadingTrims
                  ? "Loading trims..."
                  : "Select trim"}
            </option>
            {trims.map((trim) => (
              <option key={trim.id} value={trim.id}>
                {trim.name}
              </option>
            ))}
          </select>
          {form.modelId && !loadingTrims && trims.length === 0 ? (
            <p className="text-xs text-gray-500">No trims found.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
