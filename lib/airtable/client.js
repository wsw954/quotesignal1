// /lib/airtable/client.js

const AIRTABLE_API = "https://api.airtable.com/v0";
const AIRTABLE_BATCH_LIMIT = 10;

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

function chunkArray(items, size) {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function parseJsonOrThrow(res, actionLabel) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable ${actionLabel} failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function createBase() {
  const baseId = requireEnv("AIRTABLE_BASE_ID");

  function tableUrl(tableNameOrId) {
    return `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableNameOrId)}`;
  }

  function recordUrl(tableNameOrId, recordId) {
    return `${tableUrl(tableNameOrId)}/${recordId}`;
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

      const data = await parseJsonOrThrow(res, "select");
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

    const data = await parseJsonOrThrow(res, "create");
    return data.records?.[0];
  }

  async function safeCreateMany(tableNameOrId, records) {
    if (!Array.isArray(records) || !records.length) {
      return [];
    }

    const batches = chunkArray(records, AIRTABLE_BATCH_LIMIT);
    const created = [];

    for (const batch of batches) {
      const payload = {
        records: batch.map((fields) => ({ fields })),
      };

      const res = await fetch(tableUrl(tableNameOrId), {
        method: "POST",
        headers: airtableHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await parseJsonOrThrow(res, "batch create");
      created.push(...(data.records || []));
    }

    return created;
  }

  async function safeUpdate(tableNameOrId, recordId, fields) {
    if (!recordId) {
      throw new Error("safeUpdate requires a recordId");
    }

    const res = await fetch(recordUrl(tableNameOrId, recordId), {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields }),
    });

    return parseJsonOrThrow(res, "update");
  }

  async function safeBatchUpdate(tableNameOrId, updates) {
    if (!Array.isArray(updates) || !updates.length) {
      return [];
    }

    const normalized = updates
      .filter((item) => item?.id && item?.fields)
      .map((item) => ({
        id: item.id,
        fields: item.fields,
      }));

    if (!normalized.length) {
      return [];
    }

    const batches = chunkArray(normalized, AIRTABLE_BATCH_LIMIT);
    const updated = [];

    for (const batch of batches) {
      const res = await fetch(tableUrl(tableNameOrId), {
        method: "PATCH",
        headers: airtableHeaders(),
        body: JSON.stringify({ records: batch }),
      });

      const data = await parseJsonOrThrow(res, "batch update");
      updated.push(...(data.records || []));
    }

    return updated;
  }

  return {
    safeSelect,
    safeCreate,
    safeCreateMany,
    safeUpdate,
    safeBatchUpdate,
  };
}
