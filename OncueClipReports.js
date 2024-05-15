function renderClips(clips, transcriptName) {
  const anchor = document.getElementById("clipreport");
  const template = document.getElementById("cliptemplate");
  const startEl = document.getElementById("start-container");
  const pageBreaks = document.getElementById("pageBreaks").checked;
  const reportTitleEl = document.getElementById("reportTitle");
  startEl.style.display = "none";

  reportTitleEl.innerHTML = `Clips from ${transcriptName}`;
  clips.forEach((clip) => {
    var clone = template.content.cloneNode(true);
    var pgbreak = document.createElement("div");
    pgbreak.className = "pagebreak";
    clone.getElementById("clipname").innerHTML = clip.name;
    JsBarcode(clone.getElementById("barcode"), clip.barcode, {
      margin: 7,
      width: 1,
      height: 40,
      fontSize: 15,
    });
    clone.getElementById("cliptext").innerHTML = clip.lines
      .map((line) => `<pre class="depo-line">${line.text}</pre>`)
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
    const transcriptName = obj.presentation[0].designation[0].mediaID;
    renderClips(clips, transcriptName);
  };

  reader.readAsText(file);
}

function clipsFromXMLObj(obj) {
  const baseId = obj.presentation[0].mediaID;
  const transcriptName = obj.presentation[0].designation[0].mediaID;
  const segments = obj.presentation[0].scene.map((s, index) =>
    createSegment(
      s,
      obj.presentation[0].designation[parseInt(s.sourceXmlIndex)],
      baseId
    )
  );

  let merged = mergeSegments(segments);
  for (let i = 0; i < merged.length; i++) {
    merged[i].name = generateClipName(merged[i], transcriptName);
  }
  return merged;
}

function generateClipName(clip, transcriptName) {
  let startPage = clip.lines[0].page;
  let startLine = clip.lines[0].line;
  let endPage = clip.lines[clip.lines.length - 1].page;
  let endLine = clip.lines[clip.lines.length - 1].line;
  return `${startPage}:${startLine} - ${endPage}:${endLine}<span class="transcript-name">(${transcriptName})</span>`;
}

function createSegment(scene, designation, mediaID) {
  return {
    barcode: `x${mediaID}.${scene.barcodeId}`,
    lines: designation.depoLine.map((line) => {
      return {
        line: line.line,
        page: line.page,
        text: generateLine(line.line, line.prefix, line.text, line.page),
      };
    }),
    duration: Math.round(
      parseFloat(designation.stopTime) - parseFloat(designation.startTime)
    ),
    autoAdvance: scene.autoAdvance === "no",
  };
}

function mergeSegments(segments) {
  const joinedSegments = [];
  let merged = [];

  segments.forEach((segment, index) => {
    merged.push(segment);

    if (segment.autoAdvance) {
      // add cut indicator to indicate there is a cut here.
      segment.lines.push({
        line: "",
        page: "",
        text:
          '<div style="margin-top: 10px; margin-bottom: 10px"><span style="display: inline-block; transform: rotate(270deg);">\u2702\uFE0F</span>' +
          "\u2500 ".repeat(25) +
          "</div>",
      });
    } else {
      if (merged.length > 1) {
        const mergedSegment = merged.reduce((acc, seg, idx) => {
          if (idx !== 0) {
            acc.lines.push(...seg.lines);
            acc.duration += seg.duration;
          }
          return acc;
        }, merged[0]);
        joinedSegments.push(mergedSegment);
      } else {
        joinedSegments.push(merged[0]);
      }
      merged = [];
    }
  });

  return joinedSegments;
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
