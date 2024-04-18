function renderClips(clips) {
  const anchor = document.getElementById("clipreport");
  const template = document.getElementById("cliptemplate");
  const startEl = document.getElementById("start-container");
  const pageBreaks = document.getElementById("pageBreaks").checked;

  startEl.style.display = "none";

  clips.forEach((clip) => {
    var clone = template.content.cloneNode(true);
    var pgbreak = document.createElement("div");
    pgbreak.className = "pagebreak";
    clone.getElementById("clipname").textContent = clip.name;
    JsBarcode(clone.getElementById("barcode"), clip.barcode, {
      margin: 7,
      width: 1,
      height: 40,
      fontSize: 15,
    });
    clone.getElementById("cliptext").innerHTML = clip.lines
      .map((line) => `<pre class="depo-line">${line}</pre>`)
      .join("");
    clone.getElementById(
      "duration"
    ).textContent = `(running time: ${clip.duration} seconds)`;
    anchor.appendChild(clone);
    if (pageBreaks) {
      anchor.appendChild(pgbreak);
    } else {
      anchor.appendChild(document.createElement("hr"));
    }
  });
}

function parseXML() {
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");

  if (fileInput.files.length === 0) {
    alert("Please select an XML file first!");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const text = event.target.result;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");

    const obj = xmlAttributesToObj(xmlDoc.documentElement); // Start from the root element
    const clips = clipsFromXMLObj(obj);
    renderClips(clips);
  };

  reader.readAsText(file);
}

function clipsFromXMLObj(obj) {
  let baseId = obj.presentation[0].mediaID;
  let clips = [];

  obj.presentation[0].scene.forEach((s) => {
    let desig = obj.presentation[0].designation[parseInt(s.sourceXmlIndex)];
    let clip = {
      name: desig.name,
      barcode: `x${baseId}.${s.barcodeId}`,
      lines: desig.depoLine.map((l) =>
        generateLine(l.line, l.prefix, l.text, l.page)
      ),
      duration: Math.round(
        parseFloat(desig.stopTime) - parseFloat(desig.startTime)
      ),
    };
    clips.push(clip);
  });
  return clips;
}

function xmlAttributesToObj(xmlNode) {
  let obj = {};

  // Process only element nodes with attributes
  if (xmlNode.nodeType === 1 && xmlNode.attributes.length > 0) {
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attribute = xmlNode.attributes.item(i);
      obj[attribute.nodeName] = attribute.nodeValue;
    }
  }

  // Recursively process child nodes
  xmlNode.childNodes.forEach((child) => {
    if (child.nodeType === 1) {
      if (!obj[child.nodeName]) {
        obj[child.nodeName] = [];
      }
      obj[child.nodeName].push(xmlAttributesToObj(child));
    }
  });

  return obj;
}

function generateLine(number, prefix, text, page) {
  if (prefix.length > 0) {
    prefix = prefix + ".";
  } else {
    prefix = "  ";
  }
  number = parseInt(number).toString().padStart(2, "0");
  page =
    number == "01" ? parseInt(page).toString().padStart(3, "0") + ":" : "    ";
  return `${page}${number}  ${prefix}  ${text}`;
}
