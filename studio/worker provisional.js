const OWNER = "mlopezmad";
const REPO = "mlopezmad";
const BRANCH = "main";
const ALLOWED_ORIGIN = "https://mlopezmad.es";

const PROTECTED_COLLECTIONS = [
  "hall-of-fame",
  "madrid",
  "middelburg",
  "rotterdam",
  "iphone4s-cadiz",
  "iphone4s-caceres"
];

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors();

    if (request.method !== "POST") {
      return json({ error: "Método no permitido" }, 405);
    }

    const origin = request.headers.get("Origin");

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origen no permitido" }, 403);
    }

    try {
      const body = await request.json();

      if (body.password !== env.ADMIN_PASSWORD) {
        return json({ error: "Contraseña incorrecta" }, 401);
      }

      if (body.action === "upload") return await uploadPhotos(body, env);
      if (body.action === "upload_blob") return await uploadBlob(body, env);
if (body.action === "finalize_upload") return await finalizeUpload(body, env);
      if (body.action === "create_collection") return await createCollection(body, env);
      if (body.action === "delete_collection") return await deleteCollection(body, env);
      if (body.action === "delete_photo") return await deletePhoto(body, env);
      if (body.action === "update_photo_type") return await updatePhotoType(body, env);
      if (body.action === "update_photos_type") return await updatePhotosType(body, env);
      if (body.action === "set_collection_cover") return await setCollectionCover(body, env);
      if (body.action === "deploy_status") return await deployStatus(env);
      if (body.action === "analytics_stats") return await analyticsStats(env);

      return json({ error: "Acción no permitida" }, 400);

    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }
};

async function uploadPhotos(body, env) {
  const collectionPath = String(body.collectionPath || "").replace(/^\/+|\/+$/g, "");
  const files = body.files || [];

  if (!collectionPath.startsWith("images/")) return json({ error: "Ruta no permitida" }, 400);
  if (!Array.isArray(files) || files.length === 0) return json({ error: "No hay archivos" }, 400);

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);
  const treeItems = [];

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);
  const collection = collectionsData.collections.find(c => {
    const path = String(c.path || "").replace(/^\/+|\/+$/g, "");
    return path === collectionPath;
  });

  let galleryData = { imagenes: [] };

  if (collection?.json) {
    try {
      const galleryFile = await getFile(collection.json, ghHeaders);
      galleryData = JSON.parse(galleryFile.content);
      if (!Array.isArray(galleryData.imagenes)) galleryData.imagenes = [];
    } catch (error) {
      galleryData = { imagenes: [] };
    }
  }

  const existingByName = new Map();

  for (const img of galleryData.imagenes || []) {
    const archivo = img.archivo || img.file || "";
    if (archivo) existingByName.set(archivo, img);
  }

  for (const file of files) {
    const safeName = cleanFilename(file.name);
    const tipo = file.tipo === "color" ? "color" : "bn";

    const blob = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({
        content: file.content,
        encoding: "base64"
      })
    });

    treeItems.push({
      path: `${collectionPath}/${safeName}`,
      mode: "100644",
      type: "blob",
      sha: blob.sha
    });

    existingByName.set(safeName, {
      archivo: safeName,
      tipo
    });
  }

  if (collection?.json) {
    galleryData.imagenes = Array.from(existingByName.values());

    treeItems.push({
      path: collection.json,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(galleryData, null, 2)
    });
  }

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Publicar ${files.length} foto${files.length === 1 ? "" : "s"} en ${collectionPath}`
  );

  return json({
    ok: true,
    uploaded: files.length,
    path: collectionPath,
    commit: commit.sha
  });
}

async function uploadBlob(body, env) {
  const collectionPath = String(body.collectionPath || "").replace(/^\/+|\/+$/g, "");
  const file = body.file || null;

  if (!collectionPath.startsWith("images/")) {
    return json({ error: "Ruta no permitida" }, 400);
  }

  if (!file || !file.name || !file.content) {
    return json({ error: "Falta el archivo" }, 400);
  }

  const ghHeaders = githubHeaders(env);
  const safeName = cleanFilename(file.name);
  const tipo = file.tipo === "color" ? "color" : "bn";

  const blob = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      content: file.content,
      encoding: "base64"
    })
  });

  return json({
    ok: true,
    name: safeName,
    tipo,
    sha: blob.sha
  });
}
async function finalizeUpload(body, env) {
  const collectionPath = String(body.collectionPath || "").replace(/^\/+|\/+$/g, "");
  const files = Array.isArray(body.files) ? body.files : [];

  if (!collectionPath.startsWith("images/")) {
    return json({ error: "Ruta no permitida" }, 400);
  }

  if (!files.length) {
    return json({ error: "No hay archivos" }, 400);
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => {
    const path = String(c.path || "").replace(/^\/+|\/+$/g, "");
    return path === collectionPath;
  });

  if (!collection) {
    return json({ error: "Colección no encontrada" }, 404);
  }

  let galleryData = { imagenes: [] };

  if (collection.json) {
    try {
      const galleryFile = await getFile(collection.json, ghHeaders);
      galleryData = JSON.parse(galleryFile.content);

      if (!Array.isArray(galleryData.imagenes)) {
        galleryData.imagenes = [];
      }
    } catch {}
  }

  const treeItems = [];

  for (const file of files) {
    const safeName = cleanFilename(file.name);

    treeItems.push({
      path: `${collectionPath}/${safeName}`,
      mode: "100644",
      type: "blob",
      sha: file.sha
    });

    galleryData.imagenes.push({
      archivo: safeName,
      tipo: file.tipo || "bn"
    });
  }

  const galleryContent = JSON.stringify(galleryData, null, 2);

  const galleryBlob = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      content: Buffer.from(galleryContent).toString("base64"),
      encoding: "base64"
    })
  });

  treeItems.push({
    path: collection.json,
    mode: "100644",
    type: "blob",
    sha: galleryBlob.sha
  });

  const tree = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });

  const commit = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      message: `Publicación de ${files.length} fotografías`,
      tree: tree.sha,
      parents: [latestCommitSha]
    })
  });

  await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
    method: "PATCH",
    headers: ghHeaders,
    body: JSON.stringify({
      sha: commit.sha
    })
  });

  return json({
    ok: true,
    uploaded: files.length,
    commit: commit.sha
  });
}
async function createCollection(body, env) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const type = String(body.type || "portfolio").trim();
  const year = String(body.year || new Date().getFullYear()).trim();

  if (!title) return json({ error: "Falta el nombre de la colección" }, 400);

  const slug = slugify(title);
  const id = type === "iphone4s" ? `iphone4s-${slug}` : slug;
  const path = type === "iphone4s" ? `images/iphone4s/${slug}` : `images/${slug}`;
  const url = type === "iphone4s" ? `iphone4s-${slug}.html` : `${slug}.html`;
  const jsonPath = `${path}/galeria.json`;

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const exists = collectionsData.collections.some(c => c.id === id || c.url === url);
  if (exists) return json({ error: "Esa colección ya existe" }, 400);

  collectionsData.collections.push({
    id,
    title,
    type,
    ...(type === "iphone4s" ? { parent: "iphone4s" } : {}),
    description,
    path,
    json: jsonPath,
    url,
    year
  });

  const html = buildGalleryHtml({ title, description, path, jsonPath, type });

  const treeItems = [
    {
      path: "collections.json",
      mode: "100644",
      type: "blob",
      content: JSON.stringify(collectionsData, null, 2)
    },
    {
      path: jsonPath,
      mode: "100644",
      type: "blob",
      content: JSON.stringify({ imagenes: [] }, null, 2)
    },
    {
      path: url,
      mode: "100644",
      type: "blob",
      content: html
    }
  ];

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Crear colección ${title}`
  );

  return json({ ok: true, title, id, path, url, commit: commit.sha });
}

async function deleteCollection(body, env) {
  const id = String(body.id || "").trim();

  if (!id) return json({ error: "Falta el id de la colección" }, 400);

  if (PROTECTED_COLLECTIONS.includes(id)) {
    return json({ error: "Esta colección está protegida y no se puede eliminar" }, 403);
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => c.id === id);

  if (!collection) return json({ error: "Colección no encontrada" }, 404);

  collectionsData.collections = collectionsData.collections.filter(c => c.id !== id);

  const fullTree = await github(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${baseTreeSha}?recursive=1`,
    { headers: ghHeaders }
  );

  const treeItems = [];

  treeItems.push({
    path: "collections.json",
    mode: "100644",
    type: "blob",
    content: JSON.stringify(collectionsData, null, 2)
  });

  const folderPrefix = collection.path.replace(/^\/+|\/+$/g, "") + "/";

  for (const item of fullTree.tree) {
    if (item.type === "blob" && item.path.startsWith(folderPrefix)) {
      treeItems.push({
        path: item.path,
        mode: "100644",
        type: "blob",
        sha: null
      });
    }
  }

  if (collection.url) {
    treeItems.push({
      path: collection.url,
      mode: "100644",
      type: "blob",
      sha: null
    });
  }

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Eliminar colección ${collection.title}`
  );

  return json({
    ok: true,
    deleted: collection.title,
    id,
    commit: commit.sha
  });
}

async function deletePhoto(body, env) {
  const collectionId = String(body.collectionId || "").trim();
  const filename = String(body.filename || "").trim();

  if (!collectionId) return json({ error: "Falta la colección" }, 400);
  if (!filename) return json({ error: "Falta el nombre de la fotografía" }, 400);

  if (filename.includes("/") || filename.includes("..")) {
    return json({ error: "Nombre de archivo no permitido" }, 400);
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => c.id === collectionId);

  if (!collection) return json({ error: "Colección no encontrada" }, 404);

  const galleryFile = await getFile(collection.json, ghHeaders);
  const galleryData = JSON.parse(galleryFile.content);

  const imagenes = galleryData.imagenes || [];
  const before = imagenes.length;

  galleryData.imagenes = imagenes.filter(img => {
    const archivo = img.archivo || img.file || "";
    return archivo !== filename;
  });

  if (galleryData.imagenes.length === before) {
    return json({ error: "La fotografía no existe en la galería" }, 404);
  }

  const imagePath = `${collection.path}/${filename}`;

  const treeItems = [
    {
      path: collection.json,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(galleryData, null, 2)
    },
    {
      path: imagePath,
      mode: "100644",
      type: "blob",
      sha: null
    }
  ];

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Eliminar fotografía ${filename} de ${collection.title}`
  );

  return json({
    ok: true,
    deleted: filename,
    collection: collection.title,
    commit: commit.sha
  });
}

async function updatePhotoType(body, env) {
  const collectionId = String(body.collectionId || "").trim();
  const filename = String(body.filename || "").trim();
  const newType = String(body.type || "").trim();

  if (!collectionId) return json({ error: "Falta la colección" }, 400);
  if (!filename) return json({ error: "Falta el nombre de la fotografía" }, 400);

  if (newType !== "bn" && newType !== "color") {
    return json({ error: "Tipo no permitido" }, 400);
  }

  if (filename.includes("/") || filename.includes("..")) {
    return json({ error: "Nombre de archivo no permitido" }, 400);
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => c.id === collectionId);

  if (!collection) return json({ error: "Colección no encontrada" }, 404);

  const galleryFile = await getFile(collection.json, ghHeaders);
  const galleryData = JSON.parse(galleryFile.content);

  const imagenes = galleryData.imagenes || [];
  let found = false;

  galleryData.imagenes = imagenes.map(img => {
    const archivo = img.archivo || img.file || "";

    if (archivo === filename) {
      found = true;

      return {
        ...img,
        archivo,
        tipo: newType
      };
    }

    return img;
  });

  if (!found) {
    return json({ error: "La fotografía no existe en la galería" }, 404);
  }

  const treeItems = [
    {
      path: collection.json,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(galleryData, null, 2)
    }
  ];

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Cambiar tipo ${filename} a ${newType} en ${collection.title}`
  );

  return json({
    ok: true,
    updated: filename,
    type: newType,
    collection: collection.title,
    commit: commit.sha
  });
}

async function updatePhotosType(body, env) {
  const collectionId = String(body.collectionId || "").trim();
  const filenames = Array.isArray(body.filenames) ? body.filenames.map(name => String(name).trim()) : [];
  const newType = String(body.type || "").trim();

  if (!collectionId) return json({ error: "Falta la colección" }, 400);
  if (filenames.length === 0) return json({ error: "No hay fotografías seleccionadas" }, 400);

  if (newType !== "bn" && newType !== "color") {
    return json({ error: "Tipo no permitido" }, 400);
  }

  for (const filename of filenames) {
    if (!filename || filename.includes("/") || filename.includes("..")) {
      return json({ error: "Nombre de archivo no permitido" }, 400);
    }
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => c.id === collectionId);

  if (!collection) return json({ error: "Colección no encontrada" }, 404);

  const galleryFile = await getFile(collection.json, ghHeaders);
  const galleryData = JSON.parse(galleryFile.content);

  const selected = new Set(filenames);
  let updatedCount = 0;

  galleryData.imagenes = (galleryData.imagenes || []).map(img => {
    const archivo = img.archivo || img.file || "";

    if (selected.has(archivo)) {
      updatedCount++;

      return {
        ...img,
        archivo,
        tipo: newType
      };
    }

    return img;
  });

  if (updatedCount === 0) {
    return json({ error: "No se encontró ninguna fotografía seleccionada" }, 404);
  }

  const treeItems = [
    {
      path: collection.json,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(galleryData, null, 2)
    }
  ];

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Cambiar ${updatedCount} foto${updatedCount === 1 ? "" : "s"} a ${newType} en ${collection.title}`
  );

  return json({
    ok: true,
    updated: updatedCount,
    type: newType,
    collection: collection.title,
    commit: commit.sha
  });
}

async function setCollectionCover(body, env) {
  const collectionId = String(body.collectionId || "").trim();
  const filename = String(body.filename || "").trim();

  if (!collectionId) return json({ error: "Falta la colección" }, 400);
  if (!filename) return json({ error: "Falta el nombre de la fotografía" }, 400);

  if (filename.includes("/") || filename.includes("..")) {
    return json({ error: "Nombre de archivo no permitido" }, 400);
  }

  const ghHeaders = githubHeaders(env);
  const { latestCommitSha, baseTreeSha } = await getBaseTree(ghHeaders);

  const collectionsFile = await getFile("collections.json", ghHeaders);
  const collectionsData = JSON.parse(collectionsFile.content);

  const collection = collectionsData.collections.find(c => c.id === collectionId);

  if (!collection) return json({ error: "Colección no encontrada" }, 404);

  const galleryFile = await getFile(collection.json, ghHeaders);
  const galleryData = JSON.parse(galleryFile.content);

  const exists = (galleryData.imagenes || []).some(img => {
    const archivo = img.archivo || img.file || "";
    return archivo === filename;
  });

  if (!exists) {
    return json({ error: "La fotografía no existe en la galería" }, 404);
  }

  collection.cover = filename;

  const treeItems = [
    {
      path: "collections.json",
      mode: "100644",
      type: "blob",
      content: JSON.stringify(collectionsData, null, 2)
    }
  ];

  const commit = await commitTree(
    ghHeaders,
    baseTreeSha,
    latestCommitSha,
    treeItems,
    `Cambiar portada de ${collection.title}`
  );

  return json({
    ok: true,
    collection: collection.title,
    cover: filename,
    commit: commit.sha
  });
}

async function deployStatus(env) {
  const ghHeaders = githubHeaders(env);

  const runs = await github(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?branch=${BRANCH}&per_page=1`,
    { headers: ghHeaders }
  );

  const latest = runs.workflow_runs && runs.workflow_runs.length
    ? runs.workflow_runs[0]
    : null;

  if (!latest) {
    return json({
      ok: true,
      workflow: {
        status: "completed",
        conclusion: "success",
        name: "Sin workflows recientes",
        html_url: null,
        head_sha: null
      }
    });
  }

  return json({
    ok: true,
    workflow: {
      id: latest.id,
      name: latest.name,
      status: latest.status,
      conclusion: latest.conclusion,
      html_url: latest.html_url,
      head_sha: latest.head_sha,
      created_at: latest.created_at,
      updated_at: latest.updated_at
    },
    status: latest.status,
    conclusion: latest.conclusion
  });
}
async function analyticsStats(env) {
  if (!env.GA_PROPERTY_ID) {
    return json({ error: "Falta el secreto GA_PROPERTY_ID" }, 500);
  }

  if (!env.GA_SERVICE_ACCOUNT) {
    return json({ error: "Falta el secreto GA_SERVICE_ACCOUNT" }, 500);
  }

  const propertyId = String(env.GA_PROPERTY_ID).trim();
  const accessToken = await getGoogleAccessToken(env);

  const [today, week, month, countries, sources, pages, daily] = await Promise.all([
    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "today", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ]
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ]
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ]
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 5
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 5
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [
        { name: "pagePath" },
        { name: "pageTitle" }
      ],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20
    }),

    gaRunReport(propertyId, accessToken, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 40
    })
  ]);

  const todayMetrics = getMetrics(today);
  const weekMetrics = getMetrics(week);
  const monthMetrics = getMetrics(month);

  return json({
    ok: true,
    propertyId,
    generatedAt: new Date().toISOString(),

    today: {
      activeUsers: todayMetrics.activeUsers || 0,
      pageViews: todayMetrics.screenPageViews || 0,
      sessions: todayMetrics.sessions || 0
    },

    week: {
      activeUsers: weekMetrics.activeUsers || 0,
      pageViews: weekMetrics.screenPageViews || 0,
      sessions: weekMetrics.sessions || 0
    },

    month: {
      activeUsers: monthMetrics.activeUsers || 0,
      pageViews: monthMetrics.screenPageViews || 0,
      sessions: monthMetrics.sessions || 0,
      averageSessionDuration: Math.round(monthMetrics.averageSessionDuration || 0)
    },

    topGallery: getTopPublicPage(pages),
    topCountry: getTopDimension(countries, 0, "Sin datos"),
    topSource: cleanSource(getTopDimension(sources, 0, "Sin datos")),

    countries: getDimensionRows(countries, 0, "activeUsers"),
    sources: getDimensionRows(sources, 0, "sessions").map(item => ({
      ...item,
      label: cleanSource(item.label)
    })),

    daily: getDailyRows(daily)
  });
}

async function getGoogleAccessToken(env) {
  let serviceAccount;

  try {
    serviceAccount = JSON.parse(env.GA_SERVICE_ACCOUNT);
  } catch (error) {
    throw new Error("GA_SERVICE_ACCOUNT no es un JSON válido");
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("GA_SERVICE_ACCOUNT no contiene client_email/private_key");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const unsignedToken =
    `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  const signature = await signJwt(unsignedToken, serviceAccount.private_key);
  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "No se pudo obtener token de Google");
  }

  return data.access_token;
}

async function gaRunReport(propertyId, accessToken, requestBody) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Error consultando Google Analytics");
  }

  return data;
}

function getMetrics(report) {
  const row = report.rows && report.rows.length ? report.rows[0] : null;
  const headers = report.metricHeaders || [];
  const values = row?.metricValues || [];
  const result = {};

  headers.forEach((header, index) => {
    result[header.name] = Number(values[index]?.value || 0);
  });

  return result;
}

function getTopDimension(report, index, fallback) {
  const row = report.rows && report.rows.length ? report.rows[0] : null;
  return row?.dimensionValues?.[index]?.value || fallback;
}

function getDimensionRows(report, dimensionIndex, metricName) {
  return (report.rows || []).map(row => ({
    label: row.dimensionValues?.[dimensionIndex]?.value || "Sin datos",
    value: Number(row.metricValues?.[0]?.value || 0),
    metric: metricName
  }));
}

function getDailyRows(report) {
  return (report.rows || []).map(row => {
    const raw = row.dimensionValues?.[0]?.value || "";

    const formatted = raw.length === 8
      ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
      : raw;

    return {
      date: formatted,
      activeUsers: Number(row.metricValues?.[0]?.value || 0)
    };
  });
}

function getTopPublicPage(report) {
  const rows = report.rows || [];

  for (const row of rows) {
    const path = row.dimensionValues?.[0]?.value || "";
    const title = row.dimensionValues?.[1]?.value || "";

    if (!path || path.startsWith("/studio")) continue;

    return {
      path,
      title: cleanPageTitle(title, path),
      views: Number(row.metricValues?.[0]?.value || 0)
    };
  }

  return {
    path: "",
    title: "Sin datos",
    views: 0
  };
}

function cleanPageTitle(title, path) {
  if (title && title !== "(not set)") {
    return title.replace(" - mlopezmad", "");
  }

  if (!path || path === "/") return "Inicio";

  return path
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replaceAll("-", " ");
}

function cleanSource(source) {
  if (!source || source === "(not set)") return "Sin datos";
  if (source === "(direct) / (none)") return "Directo";
  return source;
}

async function signJwt(unsignedToken, privateKeyPem) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  return arrayBufferToBase64Url(signature);
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  return arrayBufferToBase64Url(bytes);
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildGalleryHtml({ title, description, path, jsonPath, type }) {
  const back = type === "iphone4s" ? "iphone4s.html" : "portfolio.html";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - mlopezmad</title>

<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png">
<link rel="shortcut icon" href="favicon.ico">
<link rel="apple-touch-icon" href="apple-touch-icon.png">

<link rel="stylesheet" href="style.css">
<script src="js/theme.js?v=3"></script>
</head>

<body>

<script>
window.GALLERY_CONFIG = {
  titulo: "${escapeJs(title)}",
  subtitulo: "${escapeJs(description || "Fotografía")}",
  carpeta: "${path}/",
  json: "${jsonPath}",
  volver: "${back}"
};
</script>

<script src="js/gallery.js?v=2"></script>

</body>
</html>`;
}

async function getFile(path, ghHeaders) {
  const data = await github(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: ghHeaders }
  );

  return {
    sha: data.sha,
    content: decodeBase64(data.content)
  };
}

async function makeBlobItem(ghHeaders, path, content) {
  const blob = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      content,
      encoding: "utf-8"
    })
  });

  return {
    path,
    mode: "100644",
    type: "blob",
    sha: blob.sha
  };
}

async function getBaseTree(ghHeaders) {
  const ref = await github(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`,
    { headers: ghHeaders }
  );

  const latestCommitSha = ref.object.sha;

  const latestCommit = await github(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`,
    { headers: ghHeaders }
  );

  return {
    latestCommitSha,
    baseTreeSha: latestCommit.tree.sha
  };
}

async function commitTree(ghHeaders, baseTreeSha, latestCommitSha, treeItems, message) {
  const tree = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });

  const newCommit = await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [latestCommitSha]
    })
  });

  await github(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers: ghHeaders,
    body: JSON.stringify({
      sha: newCommit.sha
    })
  });

  return newCommit;
}

function githubHeaders(env) {
  return {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mlopezmad-studio"
  };
}

async function github(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Error en GitHub");
  }

  return data;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanFilename(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function decodeBase64(str) {
  const binary = atob(str.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeJs(str) {
  return String(str)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function cors() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}