(() => {
  'use strict';

  const collected = { generatedAt: new Date(), device: {}, cpu: {}, memory: {}, storage: [], chromeos: {} };
  const $ = id => document.getElementById(id);
  const showValue = value => value === undefined || value === null || value === '' ? 'Não disponibilizado pelo ChromeOS ou pela política' : String(value);
  const bytes = value => {
    if (value === undefined || value === null || value === '') return null;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return null;
    if (amount === 0) return '0 GB';
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const tier = Math.min(Math.floor(Math.log(amount) / Math.log(1024)), units.length - 1);
    return `${(amount / (1024 ** tier)).toFixed(tier >= 3 ? 2 : 1)} ${units[tier]}`;
  };
  const rowHtml = (label, value) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(showValue(value))}</dd>`;
  const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const runOptional = async fn => {
    try { return await fn(); } catch { return null; }
  };
  const setProgress = (percent, message) => {
    $('progressFill').style.width = `${percent}%`;
    $('progressText').textContent = `${percent}%`;
    if (message) $('collectStatus').textContent = message;
  };

  async function collect() {
    $('statusBadge').className = 'badge busy';
    $('statusBadge').textContent = 'Coletando';
    setProgress(8, 'Lendo processador, memória e armazenamento…');

    const cpuPromise = runOptional(() => chrome.system.cpu.getInfo());
    const memoryPromise = runOptional(() => chrome.system.memory.getInfo());
    const storagePromise = runOptional(() => chrome.system.storage.getInfo());
    const platformPromise = runOptional(() => chrome.enterprise?.hardwarePlatform?.getHardwarePlatformInfo());
    const [cpu, memory, storage, platform] = await Promise.all([cpuPromise, memoryPromise, storagePromise, platformPromise]);
    setProgress(62, 'Identificando o dispositivo gerenciado…');

    const attrApi = chrome.enterprise?.deviceAttributes;
    const [serial, assetId, location, hostname] = await Promise.all([
      runOptional(() => attrApi?.getDeviceSerialNumber()),
      runOptional(() => attrApi?.getDeviceAssetId()),
      runOptional(() => attrApi?.getDeviceAnnotatedLocation()),
      runOptional(() => attrApi?.getDeviceHostname())
    ]);
    setProgress(88, 'Organizando os dados coletados…');

    const userAgent = navigator.userAgent || '';
    const osMatch = userAgent.match(/CrOS\s+\S+\s+([\d.]+)/i);
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    collected.generatedAt = new Date();
    collected.device = {
      manufacturer: platform?.manufacturer || null,
      model: platform?.model || null,
      serial,
      assetId,
      location,
      hostname
    };
    collected.cpu = {
      model: cpu?.modelName || null,
      architecture: cpu?.archName || null,
      logicalProcessors: cpu?.numOfProcessors ?? null,
      temperatures: Array.isArray(cpu?.temperatures) && cpu.temperatures.length ? cpu.temperatures : null
    };
    const totalRam = Number(memory?.capacity);
    const availableRam = Number(memory?.availableCapacity);
    collected.memory = {
      total: Number.isFinite(totalRam) && totalRam > 0 ? totalRam : null,
      available: Number.isFinite(availableRam) && availableRam >= 0 ? availableRam : null,
      used: Number.isFinite(totalRam) && Number.isFinite(availableRam) && totalRam >= availableRam ? totalRam - availableRam : null
    };
    const units = Array.isArray(storage) ? storage : [];
    const fixed = units.filter(unit => unit.type === 'fixed');
    collected.storage = await Promise.all(fixed.map(async unit => {
      let free = null;
      if (typeof chrome.system.storage.getAvailableCapacity === 'function') {
        const capacity = await runOptional(() => chrome.system.storage.getAvailableCapacity(unit.id));
        if (capacity && Number.isFinite(Number(capacity.availableCapacity))) free = Number(capacity.availableCapacity);
      }
      return { name: unit.name || 'Armazenamento interno', type: unit.type, capacity: Number(unit.capacity) || null, free };
    }));
    collected.chromeos = {
      version: osMatch?.[1] || null,
      browser: chromeMatch?.[1] || null,
      userAgent
    };

    render();
    setProgress(100, 'Coleta automática concluída.');
  }

  function render() {
    const device = collected.device;
    const deviceName = device.model || device.hostname || 'Dispositivo ChromeOS Flex';
    $('deviceHeading').textContent = deviceName;
    $('deviceFields').innerHTML = [
      rowHtml('Fabricante', device.manufacturer), rowHtml('Modelo', device.model),
      rowHtml('Número de série', device.serial), rowHtml('Patrimônio', device.assetId),
      rowHtml('Local cadastrado', device.location), rowHtml('Identificação', device.hostname),
      rowHtml('ChromeOS Flex', collected.chromeos.version), rowHtml('Navegador Chrome', collected.chromeos.browser)
    ].join('');

    const cpu = collected.cpu;
    const temperature = cpu.temperatures ? `${Math.max(...cpu.temperatures)} °C (maior sensor reportado)` : null;
    $('cpuFields').innerHTML = [
      rowHtml('Modelo', cpu.model), rowHtml('Arquitetura', cpu.architecture),
      rowHtml('Núcleos lógicos', cpu.logicalProcessors), rowHtml('Temperatura', temperature)
    ].join('');

    const memory = collected.memory;
    $('memoryFields').innerHTML = [
      rowHtml('Total', bytes(memory.total)), rowHtml('Em uso', bytes(memory.used)), rowHtml('Disponível', bytes(memory.available))
    ].join('');

    const storageRoot = $('storageFields');
    if (!collected.storage.length) {
      storageRoot.innerHTML = '<p class="storage-empty">Nenhuma unidade fixa foi disponibilizada pela API do Chrome.</p>';
    } else {
      storageRoot.innerHTML = collected.storage.map(disk => `<article class="storage-item"><strong>${escapeHtml(disk.name)}</strong><span>Tipo: ${escapeHtml(disk.type)}<br>Total: ${escapeHtml(showValue(bytes(disk.capacity)))}<br>Espaço livre: ${escapeHtml(disk.free === null ? 'Não disponibilizado nesta versão do Chrome' : bytes(disk.free))}</span></article>`).join('');
    }

    const managedFields = Boolean(device.manufacturer && device.model && device.serial);
    const hardwareAvailable = Boolean(cpu.model || memory.total || collected.storage.length);
    const badge = $('statusBadge');
    if (managedFields && hardwareAvailable) {
      badge.className = 'badge good'; badge.textContent = 'Coleta concluída';
      $('collectStatus').textContent = 'Informações disponíveis coletadas automaticamente.';
      $('policyNotice').hidden = true;
    } else {
      badge.className = 'badge partial'; badge.textContent = hardwareAvailable ? 'Coleta parcial' : 'Política necessária';
      $('collectStatus').textContent = hardwareAvailable ? 'Dados básicos coletados; a política pode liberar identificação adicional.' : 'A extensão precisa ser implantada pela política da escola para consultar o dispositivo.';
      $('policyNotice').hidden = false;
    }
  }

  function reportRows() {
    const stamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(collected.generatedAt);
    const rows = [
      ['Coleta', 'Data e hora', stamp],
      ['Dispositivo', 'Fabricante', collected.device.manufacturer],
      ['Dispositivo', 'Modelo', collected.device.model],
      ['Dispositivo', 'Número de série', collected.device.serial],
      ['Dispositivo', 'Patrimônio', collected.device.assetId],
      ['Dispositivo', 'Local cadastrado', collected.device.location],
      ['Dispositivo', 'Identificação', collected.device.hostname],
      ['ChromeOS Flex', 'Versão', collected.chromeos.version],
      ['ChromeOS Flex', 'Navegador Chrome', collected.chromeos.browser],
      ['Processador', 'Modelo', collected.cpu.model],
      ['Processador', 'Arquitetura', collected.cpu.architecture],
      ['Processador', 'Núcleos lógicos', collected.cpu.logicalProcessors],
      ['Processador', 'Temperatura máxima reportada', collected.cpu.temperatures ? `${Math.max(...collected.cpu.temperatures)} °C` : null],
      ['Memória', 'Total', bytes(collected.memory.total)],
      ['Memória', 'Em uso', bytes(collected.memory.used)],
      ['Memória', 'Disponível', bytes(collected.memory.available)]
    ];
    if (collected.storage.length) {
      collected.storage.forEach((disk, index) => {
        const item = `Armazenamento ${index + 1} — ${disk.name}`;
        rows.push(['Armazenamento', `${item} / tipo`, disk.type]);
        rows.push(['Armazenamento', `${item} / total`, bytes(disk.capacity)]);
        rows.push(['Armazenamento', `${item} / livre`, disk.free === null ? 'Não disponibilizado nesta versão do Chrome' : bytes(disk.free)]);
      });
    } else rows.push(['Armazenamento', 'Unidades fixas', 'Não disponibilizadas pela API do Chrome']);
    rows.push(['Diagnóstico', 'Bateria, conectividade e verificações', 'Use Configurações > Sobre o ChromeOS > Diagnóstico. Resultados não expostos automaticamente pela API local.']);
    return rows.map(row => [row[0], row[1], row[2] === undefined || row[2] === null || row[2] === '' ? 'Não disponibilizado pelo ChromeOS ou pela política' : String(row[2])]);
  }

  function safeXml(value) {
    return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function safeMarkdown(value) { return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'); }
  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function concatBytes(parts) {
    const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result;
  }
  function zipStore(files) {
    const encoder = new TextEncoder(); const local = []; const central = []; let offset = 0;
    const set16 = (view, pos, value) => view.setUint16(pos, value, true);
    const set32 = (view, pos, value) => view.setUint32(pos, value >>> 0, true);
    for (const [fileName, content] of files) {
      const name = encoder.encode(fileName); const data = encoder.encode(content); const crc = crc32(data);
      const header = new Uint8Array(30 + name.length + data.length); const h = new DataView(header.buffer);
      set32(h, 0, 0x04034b50); set16(h, 4, 20); set16(h, 6, 0x0800); set16(h, 8, 0); set16(h, 10, 0); set16(h, 12, 0x0021);
      set32(h, 14, crc); set32(h, 18, data.length); set32(h, 22, data.length); set16(h, 26, name.length); set16(h, 28, 0);
      header.set(name, 30); header.set(data, 30 + name.length); local.push(header);
      const dir = new Uint8Array(46 + name.length); const d = new DataView(dir.buffer);
      set32(d, 0, 0x02014b50); set16(d, 4, 20); set16(d, 6, 20); set16(d, 8, 0x0800); set16(d, 10, 0); set16(d, 12, 0); set16(d, 14, 0x0021);
      set32(d, 16, crc); set32(d, 20, data.length); set32(d, 24, data.length); set16(d, 28, name.length); set16(d, 30, 0); set16(d, 32, 0); set16(d, 34, 0); set16(d, 36, 0); set32(d, 38, 0); set32(d, 42, offset);
      dir.set(name, 46); central.push(dir); offset += header.length;
    }
    const centralDir = concatBytes(central); const end = new Uint8Array(22); const e = new DataView(end.buffer);
    set32(e, 0, 0x06054b50); set16(e, 4, 0); set16(e, 6, 0); set16(e, 8, files.length); set16(e, 10, files.length); set32(e, 12, centralDir.length); set32(e, 16, offset); set16(e, 20, 0);
    return concatBytes([...local, centralDir, end]);
  }
  function xlsxBytes(rows) {
    const letters = ['A', 'B', 'C'];
    const allRows = [['Categoria', 'Campo', 'Valor'], ...rows];
    const sheetRows = allRows.map((row, index) => `<row r="${index + 1}">${row.map((value, column) => `<c r="${letters[column]}${index + 1}" t="inlineStr"><is><t xml:space="preserve">${safeXml(value)}</t></is></c>`).join('')}</row>`).join('');
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventario" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`]
    ];
    return zipStore(files);
  }

  function baseName() {
    const name = collected.device.assetId || collected.device.serial || collected.device.hostname || 'ChromeOSFlex';
    const safe = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'ChromeOSFlex';
    const stamp = collected.generatedAt.toISOString().replace(/[:.]/g, '-');
    return `ECCOS_${safe}_${stamp}`;
  }
  function download(name, data, mime) {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function markdownReport(rows) {
    const date = rows[0][2];
    return ['# Kit ECCOS — Inventário ChromeOS Flex', '', `Coletado em: ${date}`, '', '| Categoria | Campo | Valor |', '|---|---|---|', ...rows.map(row => `| ${safeMarkdown(row[0])} | ${safeMarkdown(row[1])} | ${safeMarkdown(row[2])} |`), ''].join('\n');
  }
  function printReport(rows) {
    const categories = new Map();
    for (const row of rows) { if (!categories.has(row[0])) categories.set(row[0], []); categories.get(row[0]).push(row); }
    $('printReport').innerHTML = `<h1>ECCOS — Inventário ChromeOS Flex</h1><div class="print-meta">Coletado em ${escapeHtml(rows[0][2])}</div>${[...categories].map(([category, values]) => `<h2>${escapeHtml(category)}</h2><table><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${values.map(row => `<tr><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join('')}</tbody></table>`).join('')}`;
    window.print();
  }
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    setTimeout(() => $('toast').classList.remove('show'), 2400);
  }

  $('refresh').addEventListener('click', collect);
  $('savePdf').addEventListener('click', () => printReport(reportRows()));
  $('saveXlsx').addEventListener('click', () => download(`${baseName()}.xlsx`, xlsxBytes(reportRows()), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
  $('saveMarkdown').addEventListener('click', () => download(`${baseName()}.md`, markdownReport(reportRows()), 'text/markdown;charset=utf-8'));
  collect().catch(error => {
    $('statusBadge').className = 'badge partial'; $('statusBadge').textContent = 'Coleta indisponível';
    $('collectStatus').textContent = error?.message || 'O Chrome não liberou os dados do dispositivo.';
    $('policyNotice').hidden = false;
    toast('Não foi possível coletar os dados neste perfil do Chrome.');
  });
})();

