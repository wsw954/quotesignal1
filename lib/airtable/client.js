// lib/airtable/client.js

const AIRTABLE_API = "https://api.airtable.com/v0";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${requireEnv("AIRTABLE_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

export function createBase() {
  const baseId = requireEnv("AIRTABLE_BASE_ID");

  function tableUrl(tableNameOrId) {
    return `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableNameOrId)}`;
  }

  async function safeSelect(tableNameOrId, opts = {}) {
    const { fields, filterByFormula, sort, maxRecords, pageSize = 100 } = opts;

    const allRecords = [];
    let offset;

    do {
      const params = new URLSearchParams();

      if (Array.isArray(fields)) {
        fields.forEach((f) => params.append("fields[]", f));
      }

      if (filterByFormula) {
        params.set("filterByFormula", filterByFormula);
      }

      if (typeof maxRecords === "number") {
        params.set("maxRecords", String(maxRecords));
      }

      if (typeof pageSize === "number") {
        params.set("pageSize", String(pageSize));
      }

      if (offset) {
        params.set("offset", offset);
      }

      if (Array.isArray(sort)) {
        sort.forEach((s, i) => {
          params.set(`sort[${i}][field]`, s.field);
          if (s.direction) {
            params.set(`sort[${i}][direction]`, s.direction);
          }
        });
      }

      const url = `${tableUrl(tableNameOrId)}?${params.toString()}`;
      const res = await fetch(url, {
        headers: airtableHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Airtable select failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const pageRecords = Array.isArray(data.records) ? data.records : [];

      allRecords.push(...pageRecords);

      if (typeof maxRecords === "number" && allRecords.length >= maxRecords) {
        return allRecords.slice(0, maxRecords);
      }

      offset = data.offset;
    } while (offset);

    return allRecords;
  }

  async function safeCreate(tableNameOrId, fields) {
    const url = tableUrl(tableNameOrId);
    const res = await fetch(url, {
      method: "POST",
      headers: airtableHeaders(),
      body: JSON.stringify({ records: [{ fields }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Airtable create failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.records?.[0];
  }

  return { safeSelect, safeCreate };
}
