// PDF.jsの設定
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* =================================
   Score Palette
   STEP 2：履歴・保存機能
================================= */


/* =================================
   1. 保存データの準備
================================= */

// ブラウザ内で使う保存データの名前
const STORAGE_KEY = "scorePaletteProjects";

// 読み込んだ楽譜ファイルの保存先
const SCORE_DB_NAME = "scoreCompassFiles";
const SCORE_STORE_NAME = "files";

function openScoreDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SCORE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SCORE_STORE_NAME)) {
        db.createObjectStore(SCORE_STORE_NAME, {
          keyPath: "id"
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveScoreFile(id, file) {
  const db = await openScoreDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      SCORE_STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(SCORE_STORE_NAME).put({
      id,
      name: file.name,
      type: file.type,
      blob: file,
      lastModified: file.lastModified
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getScoreFile(id) {
  const db = await openScoreDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      SCORE_STORE_NAME,
      "readonly"
    );

    const request = transaction
      .objectStore(SCORE_STORE_NAME)
      .get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// 最初に表示するサンプルデータ
const sampleProjects = [
  {
    id: "sample-1",
    name: "宝島",
    type: "吹奏楽・全譜",
    parts: 8,
    status: "保存済み",
    date: "2026/11/15",
    updatedAt: Date.now() - 86400000
  },
  {
    id: "sample-2",
    name: "アルセナール",
    type: "吹奏楽・全譜",
    parts: 32,
    status: "分析途中",
    date: "2026/11/12",
    updatedAt: Date.now() - 259200000
  }
];


// ブラウザから保存データを読み込む
function loadProjects() {

  const savedData = localStorage.getItem(STORAGE_KEY);

  // 保存データがなければサンプルを登録
  if (savedData === null) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sampleProjects)
    );

    return [...sampleProjects];

  }

  try {

    return JSON.parse(savedData);

  } catch (error) {

    console.error("保存データを読み込めませんでした。", error);

    return [...sampleProjects];

  }

}


// 現在のプロジェクト一覧
let projects = loadProjects();


/* =================================
   2. 保存処理
================================= */

function saveProjects() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects)
  );

}


/* =================================
   3. 画面切り替え
================================= */

function showScreen(screenName) {

  // すべての画面を非表示にする
  document.querySelectorAll(".screen").forEach(screen => {

    screen.classList.remove("active");

  });

  // 指定した画面だけ表示
  const target = document.getElementById(screenName);

  if (target) {

    target.classList.add("active");

  }

  // メニューの選択状態を変更
  document.querySelectorAll(".nav-button").forEach(button => {

    const isActive = button.dataset.screen === screenName;

    button.classList.toggle("active", isActive);

  });

  // 画面の上部へ移動
  window.scrollTo(0, 0);

  // 履歴画面を開いたときは再表示
  if (screenName === "history") {

    renderProjects();

  }

}


/* =================================
   4. メニューボタン
================================= */

document.querySelectorAll("[data-screen]").forEach(button => {

  button.addEventListener("click", () => {

    showScreen(button.dataset.screen);

  });

});


/* =================================
   5. プロジェクトカードを作る
================================= */

function createProjectCard(project) {

  const card = document.createElement("div");

  card.className = "project-card";

  // アイコン
  const icon = document.createElement("div");

  icon.className = "project-icon";
  icon.textContent = "♫";

  // プロジェクト情報
  const info = document.createElement("div");

  info.className = "project-info";

  const title = document.createElement("h4");

  title.textContent = project.name;

  const detail = document.createElement("p");

  detail.textContent =
    `${project.type} ・ ${project.parts}パート`;

  const date = document.createElement("p");

  date.textContent =
    `最終編集：${project.date}`;

  info.append(title, detail, date);

  // 保存状態
  const status = document.createElement("span");

  status.className = "project-status";
  status.textContent = project.status;

  // カードに配置
  card.append(icon, info, status);

  // カードを押すと楽譜画面へ
  card.addEventListener("click", () => {

    openProject(project.id);

  });

  return card;

}


/* =================================
   6. 履歴一覧を表示
================================= */

function renderProjects() {

  const recentArea =
    document.getElementById("recent-projects");

  const allArea =
    document.getElementById("all-projects");

  // 表示を一度空にする
  recentArea.innerHTML = "";
  allArea.innerHTML = "";

  // 更新日時が新しい順に並べる
  const sortedProjects = [...projects].sort((a, b) => {

    return b.updatedAt - a.updatedAt;

  });

  // ホーム画面：最新2件
  sortedProjects.slice(0, 2).forEach(project => {

    recentArea.appendChild(
      createProjectCard(project)
    );

  });

  // 履歴画面：すべて
  sortedProjects.forEach(project => {

    allArea.appendChild(
      createProjectCard(project)
    );

  });

  // 検索欄があれば検索結果も反映
  const searchInput =
    document.getElementById("history-search");

  if (searchInput && searchInput.value) {

    filterProjects(searchInput.value);

  }

}


/* =================================
   7. プロジェクトを開く
================================= */


/* =================================
   7. プロジェクトを開く
================================= */

async function openProject(projectId) {
  const project = projects.find(item => {
    return item.id === projectId;
  });

  if (!project) return;

  localStorage.setItem(
    "scorePaletteCurrentProject",
    projectId
  );

  const scoreHeading =
    document.querySelector("#score .page-heading h2");

  if (scoreHeading) {
    scoreHeading.textContent = project.name;
  }

  try {
    const savedFile = await getScoreFile(projectId);

    if (!savedFile) {
      showScreen("score");
      alert("この履歴には楽譜ファイルが保存されていません。");
      return;
    }

    const file = new File(
      [savedFile.blob],
      savedFile.name,
      {
        type: savedFile.type,
        lastModified: savedFile.lastModified
      }
    );

    const isMusicXML =
      /\.(musicxml|xml)$/i.test(file.name) ||
      /musicxml|xml/i.test(file.type);

    const input = document.getElementById(
      isMusicXML
        ? "musicxml-file-input"
        : "score-file-input"
    );

    if (!input) {
      throw new Error("ファイル読み込み欄が見つかりません。");
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;

    // 既存プロジェクトの復元であることを読み込み処理に伝える
    input.dataset.restoringProject = "true";

    showScreen("score");

    input.dispatchEvent(
      new Event("change", { bubbles: true })
    );

  } catch (error) {
    console.error("楽譜の復元に失敗しました:", error);
    alert("楽譜を開けませんでした。");
  }
}

/* =================================
   8. 新しいプロジェクトを追加
================================= */

function addSampleProject() {

  const projectName = prompt(
    "保存する楽譜の名前を入力してください。",
    "新しい吹奏楽曲"
  );

  // キャンセルされた場合
  if (projectName === null) return;

  // 空欄の場合
  if (projectName.trim() === "") {

    alert("楽譜の名前を入力してください。");

    return;

  }

  const now = new Date();

  const date =
    now.getFullYear() + "/" +
    String(now.getMonth() + 1).padStart(2, "0") + "/" +
    String(now.getDate()).padStart(2, "0");

  // 新しいプロジェクトを作成
  const newProject = {

    id: crypto.randomUUID(),

    name: projectName.trim(),

    type: "吹奏楽・全譜",

    parts: 0,

    status: "保存済み",

    date: date,

    updatedAt: Date.now()

  };

// 一覧の先頭に追加
projects.unshift(newProject);

// ブラウザに保存
saveProjects();

// 画面を更新
renderProjects();

// ホームへ戻る
showScreen("home");

alert("プロジェクトを保存しました。");

}

/* =================================
   9. 履歴検索
================================= */

function filterProjects(keyword) {

  const allArea =
    document.getElementById("all-projects");

  allArea.innerHTML = "";

  const normalizedKeyword =
    keyword.trim().toLowerCase();

  const filteredProjects = projects.filter(project => {

    return project.name
      .toLowerCase()
      .includes(normalizedKeyword);

  });

  filteredProjects.forEach(project => {

    allArea.appendChild(
      createProjectCard(project)
    );

  });

  if (filteredProjects.length === 0) {

    const message = document.createElement("p");

    message.textContent = "該当する楽譜がありません。";

    message.style.color = "#7b899a";

    allArea.appendChild(message);

  }

}


// 検索欄の操作
document
  .getElementById("history-search")
  .addEventListener("input", event => {

    filterProjects(event.target.value);

  });


/* =================================
   10. 新規保存ボタン
================================= */

document
  .getElementById("add-sample-project")
  .addEventListener("click", addSampleProject);


/* =================================
   11. アプリ起動
================================= */

function initializeApp() {

  renderProjects();

  showScreen("home");

}


// 起動
initializeApp();


// ==================================
// STEP 3：楽譜ファイルの読み込み・プレビュー
// ==================================

const scoreFileInput = document.getElementById("score-file-input");
const selectScoreFileButton = document.getElementById("select-score-file");

const fileInformation = document.getElementById("home-file-information");
const fileName = document.getElementById("home-file-name");
const scorePreview = document.getElementById("home-score-preview");
const closePreviewButton = document.getElementById("home-close-preview");

const startAnalysisButton = document.getElementById("start-analysis");
const analysisScorePreview = document.getElementById("score-preview");

let currentFileUrl = null;

// ファイル選択ボタン
if (selectScoreFileButton && scoreFileInput) {
  selectScoreFileButton.addEventListener("click", () => {
    scoreFileInput.click();
  });
}

// ファイルが選択されたとき
if (scoreFileInput) {
  scoreFileInput.addEventListener("change", async (event) => {

    const isRestoringProject =
      event.currentTarget.dataset.restoringProject === "true";

    delete event.currentTarget.dataset.restoringProject;

    const file = event.target.files[0];

    if (!file) return;

    // ファイル形式を自動判定
    const fileNameLower = file.name.toLowerCase();

    const isPdf =
      fileNameLower.endsWith(".pdf") ||
      file.type === "application/pdf";

    const isImage =
    /\.(png|jpg|jpeg)$/.test(fileNameLower) ||
    ["image/png", "image/jpeg"].includes(file.type);

    const isMusicXML =
      fileNameLower.endsWith(".musicxml") ||
      fileNameLower.endsWith(".xml") ||
      file.type === "application/xml" ||
      file.type === "text/xml";

    // MusicXMLは現在、直接読み込みに非対応
    if (isMusicXML) {
      alert("直接のMusicXMLファイルには現在対応していません。\nPDFまたは画像形式の楽譜を読み込んでください。");
      event.target.value = "";
      return;
    }

    // PDF・画像以外は非対応
    if (!isPdf && !isImage) {
      alert("このファイル形式には対応していません。\nPDF・PNG・JPG形式の楽譜を読み込んでください。");
      event.target.value = "";
      return;
    }

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF && !isImage) {
      alert("PDF・PNG・JPG形式のファイルを選択してください。");
      scoreFileInput.value = "";
      return;
    }
    
    // ファイルを履歴用に保存
    try {
      const projectId = crypto.randomUUID();

      await saveScoreFile(projectId, file);

      const now = new Date();

      const date =
        now.getFullYear() + "/" +
        String(now.getMonth() + 1).padStart(2, "0") + "/" +
        String(now.getDate()).padStart(2, "0");

      projects.unshift({
        id: projectId,
        name: file.name.replace(/\.[^.]+$/, ""),
        type: isPDF ? "PDF" : "画像",
        parts: 0,
        status: "読み込み済み",
        date,
        updatedAt: Date.now()
      });

      saveProjects();
      renderProjects();

      localStorage.setItem(
        "scorePaletteCurrentProject",
        projectId
      );

    } catch (error) {
      console.error("楽譜の保存に失敗しました:", error);
      alert("楽譜を履歴に保存できませんでした。");
    }

    if (currentFileUrl) {
      URL.revokeObjectURL(currentFileUrl);
      currentFileUrl = null;
    }

    currentFileUrl = URL.createObjectURL(file);

    // ファイル名表示
    if (fileName) {
      fileName.textContent = file.name;
    }

    if (fileInformation) {
      fileInformation.hidden = false;
    }

    // プレビュー初期化
    if (scorePreview) {
      scorePreview.innerHTML = "";
      scorePreview.hidden = false;
    }

    if (closePreviewButton) {
      closePreviewButton.hidden = false;
    }

    // 分析開始ボタンを表示
    if (startAnalysisButton) {
      startAnalysisButton.hidden = false;
    }

    if (!scorePreview) {
      console.error("score-preview がHTMLに見つかりません。");
      return;
    }

    if (isPDF) {
    // PDFを読み込む
    pdfjsLib.getDocument(currentFileUrl).promise
        .then(async (pdf) => {
        const layerSettingsElement =
          document.getElementById("analysis-layer-settings");

        if (layerSettingsElement) {
          layerSettingsElement.hidden = false;
        }

        analysisLayerVisible = true;

        if (toggleAnalysisButton) {
        toggleAnalysisButton.hidden = false;
        toggleAnalysisButton.textContent = "分析結果を非表示";
        }

        // すべてのページを順番に表示
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

            const page = await pdf.getPage(pageNumber);

            // 描画サイズ
            const viewport = page.getViewport({ scale: 1.5 });

            // ページを入れる箱
            const pageContainer = document.createElement("div");
            pageContainer.className = "pdf-page";

            
            // PDF本体の描画用キャンバス
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // 最初にPDF本体を追加
            pageContainer.appendChild(canvas);

            // 6種類の分析レイヤーを作成
            Object.keys(analysisLayers).forEach((layerName) => {
                const overlay = document.createElement("canvas");

                overlay.className = "score-overlay";
                overlay.dataset.layer = layerName;

                overlay.width = viewport.width;
                overlay.height = viewport.height;

                // 種類ごとの表示状態を反映
                overlay.style.display = analysisLayers[layerName].visible
                    ? "block"
                    : "none";

                // PDF本体より手前に追加
                pageContainer.appendChild(overlay);
            });

            scorePreview.appendChild(pageContainer);

            // PDFを描画
            await page.render({
            canvasContext: context,
            viewport: viewport
            }).promise;

            renderScoreAnnotations(pageNumber, pageContainer);
        }
        })
        .catch((error) => {
        console.error("PDFの読み込みに失敗しました:", error);
        scorePreview.textContent = "PDFを表示できませんでした。";
        });

    } else {
      const img = document.createElement("img");

      img.src = currentFileUrl;
      img.alt = "アップロードした楽譜";

      // 画像を入れるページ用の箱
      const pageContainer = document.createElement("div");
      pageContainer.className = "pdf-page";

      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.position = "relative";
      img.style.zIndex = "1";

      pageContainer.appendChild(img);
      scorePreview.appendChild(pageContainer);

      // 画像の読み込み完了後にレイヤーを作成
      img.onload = () => {

        Object.keys(analysisLayers).forEach(layerName => {
          const overlay = document.createElement("canvas");

          overlay.className = "score-overlay";
          overlay.dataset.layer = layerName;

          overlay.width = img.naturalWidth;
          overlay.height = img.naturalHeight;

          overlay.style.display = analysisLayers[layerName].visible
            ? "block"
            : "none";

          pageContainer.appendChild(overlay);
        });

        renderScoreAnnotations(1, pageContainer);
      };
    }
  });
}

// プレビューを閉じる
if (closePreviewButton) {
  closePreviewButton.addEventListener("click", () => {
    if (scorePreview) {
      scorePreview.innerHTML = "";
      scorePreview.hidden = true;
    }

    if (fileInformation) {
      fileInformation.hidden = true;
    }

    closePreviewButton.hidden = true;

    if (scoreFileInput) {
      scoreFileInput.value = "";
    }

    if (currentFileUrl) {
      URL.revokeObjectURL(currentFileUrl);
      currentFileUrl = null;
    }

    // 楽譜画面のタイトルだけ更新する
    const scoreHeading = document.querySelector("#score .page-heading h2");

    if (scoreHeading) {
      scoreHeading.textContent = file.name;
    }

  });
}

// 分析開始ボタンを押したとき
if (startAnalysisButton) {
  startAnalysisButton.addEventListener("click", async () => {

    // ホームのプレビューを楽譜画面へ移動
    while (scorePreview.firstChild) {
      analysisScorePreview.appendChild(scorePreview.firstChild);
    }

    // 楽譜画面のファイル情報を更新
    const scoreFileInfo =
      document.getElementById("file-information");

    const scoreFileName =
      document.getElementById("file-name");

    if (scoreFileInfo) {
      scoreFileInfo.hidden = false;
    }

    if (scoreFileName) {
      scoreFileName.textContent = fileName.textContent;
    }

    // 楽譜プレビューを表示
    analysisScorePreview.hidden = false;

    // 分析表示設定を表示
    const layerSettings =
      document.getElementById("analysis-layer-settings");

    if (layerSettings) {
      layerSettings.hidden = false;
    }

    // 分析結果の表示切り替えボタンを表示
    const toggleButton =
      document.getElementById("toggle-analysis-layer");

    if (toggleButton) {
      toggleButton.hidden = false;
      toggleButton.textContent = "分析結果を非表示";
    }

    // プレビューを閉じるボタンを表示
    const scoreCloseButton =
      document.getElementById("close-preview");

    if (scoreCloseButton) {
      scoreCloseButton.hidden = false;
    }

    // ホーム側の表示を隠す
    scorePreview.hidden = true;
    startAnalysisButton.hidden = true;

    // 分析画面へ移動
    showScreen("score");

    // 進行バーを表示
    const analysisLoading =
      document.getElementById("analysis-loading");

    if (analysisLoading) {
      analysisLoading.hidden = false;
    }

    // 分析開始ボタンを一時的に無効化
    startAnalysisButton.disabled = true;

    try {
      if (!runAutomaticRecognition) {
        throw new Error("自動認識処理が準備できていません。");
      }

      // PDF・画像の認識と分析を開始
      await runAutomaticRecognition();

    } catch (error) {
      console.error("分析開始エラー:", error);

      setAnalysisProgress(
        "分析に失敗しました：" +
        (error?.message || "原因不明のエラー")
      );

    } finally {
      startAnalysisButton.disabled = false;
    }
  });
}

/* =====================================
   STEP 5：MusicXML読み込み・解析
===================================== */

const musicXmlInput = document.getElementById("musicxml-file-input");
const musicXmlButton = document.getElementById("select-musicxml-file");
const musicXmlResult = document.getElementById("musicxml-result");

// 読み込んだ楽譜データを保存する変数
let musicXmlScoreData = null;

// ファイル選択ボタン
if (musicXmlButton && musicXmlInput) {
  musicXmlButton.addEventListener("click", () => {
    musicXmlInput.click();
  });
}

// XML内の直接の子要素を取得する関数
function getXmlChild(parent, tagName) {
  return Array.from(parent.children).find(
    child => child.tagName === tagName
  ) || null;
}

// XML内の文字を取得する関数
function getXmlText(parent, tagName, defaultValue = "") {
  const element = getXmlChild(parent, tagName);

  return element
    ? element.textContent.trim()
    : defaultValue;
}

// MusicXMLを解析する関数
function parseMusicXML(xmlText) {

  const parser = new DOMParser();

  const xmlDocument = parser.parseFromString(
    xmlText,
    "application/xml"
  );

  // XMLの読み込みエラーを確認
  if (xmlDocument.querySelector("parsererror")) {
    throw new Error("MusicXMLの形式を読み取れませんでした。");
  }

  const root = xmlDocument.documentElement;

    // Sheetscanが保存したページレイアウト情報を取得
    const miscellaneousFields = Array.from(
      xmlDocument.getElementsByTagName("miscellaneous-field")
    );

    const staffLayoutField = miscellaneousFields.find(
      field => field.getAttribute("name") === "staff-layout"
    );

    let pageLayouts = [];

    if (staffLayoutField && staffLayoutField.textContent) {
      try {
        pageLayouts = JSON.parse(staffLayoutField.textContent);
      } catch (error) {
        console.warn("ページレイアウト情報を読み取れませんでした。", error);
      }
    }

  if (root.tagName !== "score-partwise") {
    throw new Error(
      "現在はscore-partwise形式のMusicXMLに対応しています。"
    );
  }

  // パート名を取得
  const partNameMap = {};

  const scoreParts = Array.from(
    xmlDocument.getElementsByTagName("score-part")
  );

  scoreParts.forEach(part => {
    const id = part.getAttribute("id");

    partNameMap[id] = {
      name: getXmlText(part, "part-name", "名称不明"),
      instrument: getXmlText(
        getXmlChild(part, "score-instrument") || part,
        "instrument-name",
        ""
      )
    };
  });

  // 各パートを解析
  const xmlParts = Array.from(
    xmlDocument.getElementsByTagName("part")
  );

  const parts = xmlParts.map(part => {

    const partId = part.getAttribute("id");

    const partInfo = partNameMap[partId] || {
      name: "名称不明",
      instrument: ""
    };

    let divisions = 1;
    let keyFifths = null;
    let timeBeats = null;
    let timeBeatType = null;
    let clefSign = "";
    let clefLine = "";
    // 移調情報
    let transposeDiatonic = 0;
    let transposeChromatic = 0;
    let transposeOctaveChange = 0;

    const measures = Array.from(
      part.children
    ).filter(child => child.tagName === "measure");

    const parsedMeasures = measures.map(measure => {

      const attributesList = Array.from(
        measure.children
      ).filter(child => child.tagName === "attributes");

      attributesList.forEach(attributes => {

        const divisionsElement =
          getXmlChild(attributes, "divisions");

        if (divisionsElement) {
          divisions = Number(divisionsElement.textContent);
        }

        const key = getXmlChild(attributes, "key");

        if (key) {
          keyFifths = Number(
            getXmlText(key, "fifths", "0")
          );
        }

        const time = getXmlChild(attributes, "time");

        if (time) {
          timeBeats = getXmlText(time, "beats");
          timeBeatType = getXmlText(time, "beat-type");
        }

        const clef = getXmlChild(attributes, "clef");

        // 移調楽器の情報を取得
        const transpose = getXmlChild(attributes, "transpose");

        if (transpose) {
          transposeDiatonic = Number(
            getXmlText(transpose, "diatonic", "0")
          );

          transposeChromatic = Number(
            getXmlText(transpose, "chromatic", "0")
          );

          transposeOctaveChange = Number(
            getXmlText(transpose, "octave-change", "0")
          );
        }

        if (clef) {
          clefSign = getXmlText(clef, "sign");
          clefLine = getXmlText(clef, "line");
        }
      });

      
      // 音符・休符を取得し、演奏開始位置も記録する
      let cursor = 0;
      let lastNoteStart = 0;

      const parsedNotes = [];

      Array.from(measure.children).forEach(element => {

        // 時間を戻す（複数の声部に対応）
        if (element.tagName === "backup") {
          cursor -= Number(
            getXmlText(element, "duration", "0")
          );
          return;
        }

        // 時間を進める
        if (element.tagName === "forward") {
          cursor += Number(
            getXmlText(element, "duration", "0")
          );
          return;
        }

        if (element.tagName !== "note") return;

        const pitch = getXmlChild(element, "pitch");
        const rest = getXmlChild(element, "rest");
        const isChord = Boolean(
          getXmlChild(element, "chord")
        );
        const isGrace = Boolean(
          getXmlChild(element, "grace")
        );

        // Sheetscanが付けた音符の位置情報を取得
        const noteId = element.getAttribute("id") || "";

        const positionMatch = noteId.match(
          /^n\d+-p(\d+)-(\d+)-(\d+)$/
        );

        const imagePosition = positionMatch
          ? {
              page: Number(positionMatch[1]) + 1,
              x: Number(positionMatch[2]),
              y: Number(positionMatch[3])
            }
          : null;

        let noteName = null;
        let octave = null;
        let alter = 0;
        let midiNumber = null;

        if (pitch) {
          const step = getXmlText(pitch, "step");
          octave = Number(getXmlText(pitch, "octave"));

          alter = Number(
            getXmlText(pitch, "alter", "0")
          );

          const semitones = {
            C: 0, D: 2, E: 4, F: 5,
            G: 7, A: 9, B: 11
          };

          midiNumber =
            (octave + 1) * 12 +
            semitones[step] +
            alter;

          noteName =
            step +
            (alter === 1 ? "#" :
             alter === -1 ? "b" : "");
        }

        const duration = Number(
          getXmlText(element, "duration", "0")
        );

        // 和音の構成音は直前の音と同じ開始位置にする
        const onset = isChord ? lastNoteStart : cursor;

        if (!isChord) {
          lastNoteStart = cursor;

          if (!isGrace) {
            cursor += duration;
          }
        }

        parsedNotes.push({
          isRest: Boolean(rest),
          noteName,
          octave,
          alter,
          midiNumber,
          duration,
          onset,

          // 画像上の音符位置
          imagePosition,

          // 4分音符を1とする共通単位
          durationBeats: duration / divisions,
          onsetBeats: onset / divisions,

          type: getXmlText(element, "type", ""),
          voice: getXmlText(element, "voice", "1"),
          staff: getXmlText(element, "staff", "1"),
          isChord,
          isGrace
        });
      
      });

      return {
        number: measure.getAttribute("number"),
        divisions,
        notes: parsedNotes
      };

    });

    const noteCount = parsedMeasures.reduce(
      (total, measure) =>
        total + measure.notes.filter(note => !note.isRest).length,
      0
    );

    const restCount = parsedMeasures.reduce(
      (total, measure) =>
        total + measure.notes.filter(note => note.isRest).length,
      0
    );

    return {
      id: partId,
      name: partInfo.name,
      instrument: partInfo.instrument,
      measureCount: parsedMeasures.length,
      noteCount,
      restCount,
      keyFifths,
      timeBeats,
      timeBeatType,
      clefSign,
      clefLine,
      transposeDiatonic,
      transposeChromatic,
      transposeOctaveChange,
      measures: parsedMeasures
    };
  });

  return {
    title: getXmlText(
      getXmlChild(root, "work") || root,
      "work-title",
      "名称未設定"
    ),
    partCount: parts.length,
    pageLayouts,
    parts
  };
}

// 全パートの音符・休符を時間軸データにまとめる
function createScoreTimeline(scoreData) {
  const events = [];

  scoreData.parts.forEach(part => {
    part.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach(note => {
        events.push({
          partId: part.id,
          partName: part.name,
          instrument: part.instrument,

          measureIndex,
          measureNumber: measure.number,

          // 楽譜に書かれた音
          noteName: note.noteName,
          octave: note.octave,
          midiNumber: note.midiNumber,

          // 実際に鳴る音（実音）
          concertMidiNumber: note.midiNumber === null
            ? null
            : note.midiNumber
              + (part.transposeChromatic || 0)
              + 12 * (part.transposeOctaveChange || 0),

          isRest: note.isRest,
          isChord: note.isChord,
          isGrace: note.isGrace,

          onsetBeats: note.onsetBeats,
          durationBeats: note.durationBeats,

          voice: note.voice,
          staff: note.staff,
          imagePosition: note.imagePosition || null,
        });
      });
    });
  });

  return events;
}

// MusicXMLのパート・五線・声部番号から、独立した声部を識別する
function getScoreVoiceKey(event) {
  return [
    event.partId ?? "unknown-part",
    event.staff ?? "1",
    event.voice ?? "1"
  ].join("::");
}

// 声部ごとの基本情報を作成する。既存のパート単位分析は変更せず、
// 声部を独立して追跡できる情報を追加する。
function analyzeVoiceFeatures(events) {
  const voices = new Map();

  events.forEach(event => {
    const voiceKey = getScoreVoiceKey(event);

    if (!voices.has(voiceKey)) {
      voices.set(voiceKey, {
        voiceKey,
        partId: event.partId,
        partName: event.partName,
        instrument: event.instrument,
        staff: String(event.staff ?? "1"),
        voice: String(event.voice ?? "1"),
        events: []
      });
    }

    voices.get(voiceKey).events.push(event);
  });

  return Array.from(voices.values()).map(voice => {
    const notes = voice.events.filter(event =>
      !event.isRest &&
      !event.isGrace &&
      Number.isFinite(event.concertMidiNumber)
    );
    const pitches = notes.map(event => event.concertMidiNumber);
    const measureIndexes = [...new Set(
      voice.events.map(event => event.measureIndex)
    )];

    return {
      voiceKey: voice.voiceKey,
      partId: voice.partId,
      partName: voice.partName,
      instrument: voice.instrument,
      staff: voice.staff,
      voice: voice.voice,
      noteCount: notes.length,
      restCount: voice.events.filter(event => event.isRest).length,
      measureCount: measureIndexes.length,
      minPitch: pitches.length ? Math.min(...pitches) : null,
      maxPitch: pitches.length ? Math.max(...pitches) : null,
      averagePitch: pitches.length
        ? pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length
        : null,
      events: voice.events
    };
  });
}

// 同時演奏の分析
function analyzeSimultaneousEvents(events) {
  const groups = new Map();

  events
    .filter(event =>
      !event.isRest &&
      !event.isGrace &&
      event.concertMidiNumber !== null
    )
    .forEach(event => {
      const key = [
        event.measureIndex,
        Number(event.onsetBeats.toFixed(6))
      ].join("_");

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(event);
    });

  return Array.from(groups.values())
    .filter(group =>
      new Set(group.map(event => event.partId)).size >= 2
    )
    .map(group => {
      const pitches = new Set(
        group.map(event => event.concertMidiNumber)
      );

      return {
        measureNumber: group[0].measureNumber,
        onsetBeats: group[0].onsetBeats,

        type: pitches.size === 1
          ? "unison"
          : "harmony",

        partIds: [
          ...new Set(group.map(event => event.partId))
        ],

        events: group
      };
    });
}

function analyzePartFeatures(events) {
  const parts = new Map();

  events.forEach(event => {
    if (!parts.has(event.partId)) {
      parts.set(event.partId, []);
    }

    parts.get(event.partId).push(event);
  });

  return Array.from(parts.entries()).map(([partId, partEvents]) => {
    const notes = partEvents.filter(event =>
      !event.isRest &&
      !event.isGrace &&
      Number.isFinite(event.concertMidiNumber)
    );

    const pitches = notes.map(event => event.concertMidiNumber);

    const durations = notes
      .map(event => event.durationBeats)
      .filter(Number.isFinite);

    const measures = new Set(
      notes.map(event => event.measureIndex)
    );

    const average = values =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    return {
      partId,
      partName: partEvents[0]?.partName ?? "",
      instrument: partEvents[0]?.instrument ?? "",

      noteCount: notes.length,

      minPitch: pitches.length ? Math.min(...pitches) : null,
      maxPitch: pitches.length ? Math.max(...pitches) : null,
      averagePitch: average(pitches),

      averageDuration: average(durations),

      activeMeasureCount: measures.size
    };
  });
}

function suggestPartRoles(features) {
  const validParts = features.filter(part =>
    Number.isFinite(part.averagePitch) &&
    part.noteCount > 0
  );

  if (validParts.length === 0) return [];

  const sortedByPitch = [...validParts].sort(
    (a, b) => a.averagePitch - b.averagePitch
  );

  const sortedByCount = [...validParts].sort(
    (a, b) => b.noteCount - a.noteCount
  );

  const pitchRank = new Map(
    sortedByPitch.map((part, index) => [
      part.partId,
      index
    ])
  );

  const countRank = new Map(
    sortedByCount.map((part, index) => [
      part.partId,
      index
    ])
  );

  return validParts.map(part => {
    const lowRank = pitchRank.get(part.partId);
    const highRank = validParts.length - 1 - lowRank;
    const densityRank = countRank.get(part.partId);

    const candidates = [];

    if (lowRank === 0) {
      candidates.push("ベース候補");
    }

    if (
      highRank === 0 &&
      part.noteCount >= 3
    ) {
      candidates.push("高音域パート候補");
    }

    if (
      densityRank === 0 &&
      part.noteCount >= 3
    ) {
      candidates.push("伴奏候補");
    }

    return {
      partId: part.partId,
      partName: part.partName,
      candidates
    };
  });
}

function analyzeMelodicMotion(events) {
  const voices = new Map();

  events.forEach(event => {
    if (
      event.isRest ||
      event.isGrace ||
      !Number.isFinite(event.concertMidiNumber)
    ) {
      return;
    }

    const voiceKey = getScoreVoiceKey(event);

    if (!voices.has(voiceKey)) {
      voices.set(voiceKey, []);
    }

    voices.get(voiceKey).push(event);
  });

  const results = [];

  voices.forEach((notes, voiceKey) => {
    const sorted = [...notes].sort((a, b) =>
      a.measureIndex - b.measureIndex ||
      a.onsetBeats - b.onsetBeats
    );

    // 同じ開始位置の音をまとめる
    const onsetGroups = new Map();

    sorted.forEach(note => {
      const key = `${note.measureIndex}_${note.onsetBeats}`;

      if (!onsetGroups.has(key)) {
        onsetGroups.set(key, []);
      }

      onsetGroups.get(key).push(note);
    });

    const uniqueNotes = [];

    onsetGroups.forEach(group => {
      // 和音など複数音が同時に鳴る場合は旋律比較から除外
      if (group.length !== 1) return;

      uniqueNotes.push(group[0]);
    });

    uniqueNotes.sort((a, b) =>
      a.measureIndex - b.measureIndex ||
      a.onsetBeats - b.onsetBeats
    );

    const intervals = [];

    for (let i = 1; i < uniqueNotes.length; i++) {
      const previous = uniqueNotes[i - 1];
      const current = uniqueNotes[i];

      intervals.push(
        current.concertMidiNumber -
        previous.concertMidiNumber
      );
    }

    const stepwiseCount = intervals.filter(interval =>
      Math.abs(interval) <= 2 && interval !== 0
    ).length;

    const leapCount = intervals.filter(interval =>
      Math.abs(interval) >= 5
    ).length;

    const directionChanges = intervals.filter((interval, index) =>
      index > 0 &&
      interval !== 0 &&
      intervals[index - 1] !== 0 &&
      Math.sign(interval) !== Math.sign(intervals[index - 1])
    ).length;

    results.push({
      voiceKey,
      partId: notes[0].partId,
      partName: notes[0].partName,
      intervalCount: intervals.length,

      stepwiseRatio: intervals.length
        ? stepwiseCount / intervals.length
        : 0,

      leapCount,
      directionChanges
    });
  });

  return results;
}

function rankMelodyCandidates(features, motionAnalysis) {
  const validParts = features.filter(part =>
    Number.isFinite(part.averagePitch) &&
    part.noteCount > 0
  );

  if (validParts.length === 0) return [];

  // 複数の声部がある場合は、パート単位で集約する
  const motionByPart = new Map();

  motionAnalysis.forEach(item => {
    if (!motionByPart.has(item.partId)) {
      motionByPart.set(item.partId, {
        intervalCount: 0,
        weightedStepwise: 0,
        leapCount: 0,
        directionChanges: 0
      });
    }

    const result = motionByPart.get(item.partId);

    result.intervalCount += item.intervalCount;
    result.weightedStepwise +=
      item.stepwiseRatio * item.intervalCount;

    result.leapCount += item.leapCount;
    result.directionChanges += item.directionChanges;
  });

  const minPitch = Math.min(
    ...validParts.map(part => part.averagePitch)
  );

  const maxPitch = Math.max(
    ...validParts.map(part => part.averagePitch)
  );

  const pitchRange = maxPitch - minPitch;

  return validParts.map(part => {
    const motion = motionByPart.get(part.partId);

    const stepwiseRatio =
      motion && motion.intervalCount > 0
        ? motion.weightedStepwise / motion.intervalCount
        : null;

    // 音域の高さ
    const pitchScore = pitchRange > 0
      ? (part.averagePitch - minPitch) / pitchRange
      : 0.5;

    // 旋律らしい音の動き
    const motionScore = stepwiseRatio ?? 0;

    // 音の動きが十分に確認できるか
    const activityScore =
      motion && motion.intervalCount >= 3
        ? 1
        : 0;

    // 楽器の音域に収まっている割合
    const rangeScore =
      Number.isFinite(part.inRangeRatio)
        ? part.inRangeRatio
        : null;

    // 音域情報が不明なら、その評価項目を除外する
    const weightedScores = [
      { value: pitchScore, weight: 0.20 },
      { value: motionScore, weight: 0.40 },
      { value: activityScore, weight: 0.15 },
      ...(rangeScore !== null
        ? [{ value: rangeScore, weight: 0.25 }]
        : [])
    ];

    const totalWeight = weightedScores.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    const score = weightedScores.reduce(
      (sum, item) =>
        sum + item.value * item.weight,
      0
    ) / totalWeight;

    return {
      partId: part.partId,
      partName: part.partName,
      melodyScore: Math.round(score * 100),
      candidate:
        motion !== undefined &&
        motion.intervalCount >= 3 &&
        score >= 0.55
    };
  }).sort((a, b) =>
    b.melodyScore - a.melodyScore
  );
}

function analyzePartRelationships(simultaneousAnalysis, melodyCandidates) {
  const melodyIds = new Set(
    melodyCandidates
      .filter(item => item.candidate)
      .map(item => item.partId)
  );

  const relationships = new Map();

  simultaneousAnalysis.forEach(group => {
    const melodyParts = group.partIds.filter(id =>
      melodyIds.has(id)
    );

    if (melodyParts.length === 0) return;

    const otherParts = group.partIds.filter(id =>
      !melodyIds.has(id)
    );

    melodyParts.forEach(melodyId => {
      otherParts.forEach(otherId => {
        const key = `${melodyId}_${otherId}`;

        if (!relationships.has(key)) {
          relationships.set(key, {
            melodyPartId: melodyId,
            otherPartId: otherId,
            simultaneousCount: 0,
            unisonCount: 0,
            harmonyCount: 0
          });
        }

        const result = relationships.get(key);

        result.simultaneousCount++;

        if (group.type === "unison") {
          result.unisonCount++;
        } else {
          result.harmonyCount++;
        }
      });
    });
  });

  return Array.from(relationships.values());
}

function analyzeCounterMelodyCandidates(events, melodyCandidates) {
  const melodyIds = new Set(
    melodyCandidates
      .filter(item => item.candidate)
      .map(item => item.partId)
  );

  const partEvents = new Map();

  events.forEach(event => {
    if (
      event.isRest ||
      event.isGrace ||
      !Number.isFinite(event.concertMidiNumber)
    ) {
      return;
    }

    if (!partEvents.has(event.partId)) {
      partEvents.set(event.partId, []);
    }

    partEvents.get(event.partId).push(event);
  });

  const getMotion = notes => {
    const sorted = [...notes].sort((a, b) =>
      a.measureIndex - b.measureIndex ||
      a.onsetBeats - b.onsetBeats
    );

    const result = [];

    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];

      result.push({
        measureIndex: current.measureIndex,
        measureNumber: current.measureNumber,
        onsetBeats: current.onsetBeats,
        direction: Math.sign(
          current.concertMidiNumber -
          previous.concertMidiNumber
        )
      });
    }

    return result;
  };

  const melodyMotions = new Map();

  melodyIds.forEach(id => {
    melodyMotions.set(
      id,
      getMotion(partEvents.get(id) || [])
    );
  });

  const results = [];

  partEvents.forEach((notes, partId) => {
    if (melodyIds.has(partId)) return;

    const otherMotion = getMotion(notes);

    melodyMotions.forEach((mainMotion, melodyId) => {
      const mainByTime = new Map(
        mainMotion.map(item => [
          `${item.measureIndex}_${item.onsetBeats}`,
          item.direction
        ])
      );

      let sameDirection = 0;
      let oppositeDirection = 0;
      let comparedCount = 0;

      otherMotion.forEach(item => {
        const key =
          `${item.measureIndex}_${item.onsetBeats}`;

        if (!mainByTime.has(key)) return;

        const mainDirection = mainByTime.get(key);

        if (
          mainDirection === 0 ||
          item.direction === 0
        ) {
          return;
        }

        comparedCount++;

        if (mainDirection === item.direction) {
          sameDirection++;
        } else {
          oppositeDirection++;
        }
      });

      results.push({
        melodyPartId: melodyId,
        otherPartId: partId,
        comparedCount,
        sameDirection,
        oppositeDirection,
        relationship:
          comparedCount < 3
            ? "判定材料不足"
            : oppositeDirection > sameDirection
              ? "反対方向の動きが多い"
              : sameDirection > oppositeDirection
                ? "同じ方向の動きが多い"
                : "方向が混在"
      });
    });
  });

  return results;
}

function analyzeOverlappingEvents(events) {
  const measures = new Map();

  events.forEach(event => {
    if (
      event.isRest ||
      event.isGrace ||
      !Number.isFinite(event.onsetBeats) ||
      !Number.isFinite(event.durationBeats) ||
      event.durationBeats <= 0 ||
      !Number.isFinite(event.concertMidiNumber)
    ) {
      return;
    }

    if (!measures.has(event.measureIndex)) {
      measures.set(event.measureIndex, []);
    }

    measures.get(event.measureIndex).push({
      ...event,
      endBeats: event.onsetBeats + event.durationBeats
    });
  });

  const results = [];

  measures.forEach((notes, measureIndex) => {
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];

        // 同じパート内の音は対象外
        if (a.partId === b.partId) continue;

        const overlapStart = Math.max(
          a.onsetBeats,
          b.onsetBeats
        );

        const overlapEnd = Math.min(
          a.endBeats,
          b.endBeats
        );

        // 重なりがなければ対象外
        if (overlapEnd <= overlapStart) continue;

        results.push({
          measureIndex,
          measureNumber: a.measureNumber,
          partA: a.partId,
          partB: b.partId,
          partAName: a.partName,
          partBName: b.partName,

          startBeat: overlapStart,
          endBeat: overlapEnd,
          overlapDuration: overlapEnd - overlapStart,

          samePitch:
            a.concertMidiNumber === b.concertMidiNumber,

          pitchDifference:
            Math.abs(
              a.concertMidiNumber - b.concertMidiNumber
            )
        });
      }
    }
  });

  return results;
}

function analyzeMelodyOverlapRoles(overlappingAnalysis, melodyCandidates) {
  const melodyIds = new Set(
    melodyCandidates
      .filter(item => item.candidate)
      .map(item => item.partId)
  );

  const relationships = new Map();

  overlappingAnalysis.forEach(event => {
    let melodyId;
    let otherId;
    let otherName;

    if (melodyIds.has(event.partA)) {
      melodyId = event.partA;
      otherId = event.partB;
      otherName = event.partBName;
    } else if (melodyIds.has(event.partB)) {
      melodyId = event.partB;
      otherId = event.partA;
      otherName = event.partAName;
    } else {
      return;
    }

    // メロディ候補同士は比較しない
    if (melodyIds.has(otherId)) return;

    const key = `${melodyId}_${otherId}`;

    if (!relationships.has(key)) {
      relationships.set(key, {
        melodyPartId: melodyId,
        otherPartId: otherId,
        otherPartName: otherName,
        overlapCount: 0,
        totalOverlapDuration: 0,
        samePitchCount: 0,
        differentPitchCount: 0
      });
    }

    const result = relationships.get(key);

    result.overlapCount++;
    result.totalOverlapDuration += event.overlapDuration;

    if (event.samePitch) {
      result.samePitchCount++;
    } else {
      result.differentPitchCount++;
    }
  });

  return Array.from(relationships.values()).map(item => {
    const total = item.samePitchCount + item.differentPitchCount;

    const samePitchRatio = total
      ? item.samePitchCount / total
      : 0;

    return {
      ...item,
      samePitchRatio,

      relationship:
        samePitchRatio >= 0.6
          ? "ユニゾン傾向"
          : "異なる音で重なる傾向"
    };
  });
}

// MusicXMLの分析を実行する関数
function runMusicXMLAnalysis() {

  console.time("MusicXML分析全体");

  resetScoreAnalysisDisplay();

  const analysisLoading = document.getElementById("analysis-loading");

  if (analysisLoading) {
    analysisLoading.hidden = false;
  }

  // 全パートの時間軸データを作成
  window.scoreTimeline =
    createScoreTimeline(musicXmlScoreData);

  // 声部をパート・五線・声部番号ごとに識別する
  window.voiceFeatures =
    analyzeVoiceFeatures(window.scoreTimeline);

  console.log("声部識別結果:", window.voiceFeatures.map(voice => ({
    voiceKey: voice.voiceKey,
    partName: voice.partName,
    staff: voice.staff,
    voice: voice.voice,
    noteCount: voice.noteCount,
    restCount: voice.restCount,
    measureCount: voice.measureCount
  })));

  // 同時演奏を分析
  window.simultaneousAnalysis =
    analyzeSimultaneousEvents(window.scoreTimeline);

  window.partFeatures =
    analyzePartFeatures(window.scoreTimeline);

  window.partFeatures =
    window.partFeatures.map(part => {
      const instrumentName =
        `${part.partName} ${part.instrument}`;

      const instrumentRange =
        getInstrumentRange(instrumentName);

      const pitches = window.scoreTimeline
        .filter(event =>
          event.partId === part.partId &&
          Number.isFinite(event.concertMidiNumber)
        )
        .map(event => event.concertMidiNumber);

      const inRangeCount = instrumentRange
        ? pitches.filter(pitch =>
            pitch >= instrumentRange.min &&
            pitch <= instrumentRange.max
          ).length
        : null;

      return {
        ...part,
        instrumentFamily:
          detectInstrumentFamily(instrumentName),
        instrumentRange,
        inRangeRatio:
          instrumentRange && pitches.length
            ? inRangeCount / pitches.length
            : null
      };
    });
  
  console.log("時間軸データ:", window.scoreTimeline.length, window.scoreTimeline.slice(0, 5));
  console.log("パート特徴データ:", window.partFeatures);
  console.log("役割分析結果:", window.partRoleResults);

  window.partRoleSuggestions =
    suggestPartRoles(window.partFeatures);

  window.melodicMotionAnalysis =
    analyzeMelodicMotion(window.scoreTimeline);

  window.melodyCandidates =
    rankMelodyCandidates(
      window.partFeatures,
      window.melodicMotionAnalysis
    );

  window.partRelationships =
    analyzePartRelationships(
      window.simultaneousAnalysis,
      window.melodyCandidates
    );

  window.counterMelodyAnalysis =
    analyzeCounterMelodyCandidates(
      window.scoreTimeline,
      window.melodyCandidates
    );

  window.overlappingAnalysis =
    analyzeOverlappingEvents(window.scoreTimeline);

  window.melodyOverlapRoles =
    analyzeMelodyOverlapRoles(
      window.overlappingAnalysis,
      window.melodyCandidates
    );

  window.rhythmRelationships =
    analyzeRhythmRelationships(window.scoreTimeline);

  window.partRoleResults =
    classifyPartRoles({
      partFeatures: window.partFeatures,
      melodyCandidates: window.melodyCandidates,
      counterMelody: window.counterMelodyAnalysis,
      rhythmRelationships: window.rhythmRelationships
    });

  // 全体分析を参考情報として残しつつ、小節ごとの役割を判定する。
  window.measureRoleResults = analyzeMeasureRoleResults(
    window.scoreTimeline,
    window.partFeatures,
    window.partRoleResults
  );

  console.log("小節ごとの役割分析結果:", window.measureRoleResults);
  console.log("小節ごとの声部分析結果:", (window.measureRoleResults || []).map(measure => ({
    measureNumber: measure.measureNumber,
    voices: (measure.voiceFeatures || []).map(voice => ({
      partName: voice.partName,
      staff: voice.staff,
      voice: voice.voice,
      noteCount: voice.noteCount,
      restCount: voice.restCount,
      minPitch: voice.minPitch,
      maxPitch: voice.maxPitch
    }))
  })));
  console.log("小節ごとの声部役割候補:", (window.measureRoleResults || []).map(measure => ({
    measureNumber: measure.measureNumber,
    voices: (measure.voiceRoleResults || []).map(voice => ({
      partName: voice.partName,
      staff: voice.staff,
      voice: voice.voice,
      roles: voice.roles,
      status: voice.status,
      reason: voice.reason
    }))
  })));
  console.log("役割分析結果（生成後）:", window.partRoleResults);
  console.log("主旋律候補:", window.melodyCandidates);
  console.log("対旋律分析:", window.counterMelodyAnalysis);
  console.log("リズム分析:", window.rhythmRelationships);

  window.scoreRoleAnnotations =
    createRoleAnnotationData();

  // 生成した役割注釈を描画用レイヤーへ登録する。
  // この呼び出しがないと、分析結果があってもscoreAnnotationsが空のままになる。
  applyRoleAnnotationData();

  console.log("[マーカー登録診断]", Object.fromEntries(
    Object.entries(scoreAnnotations).map(([name, items]) => [name, items.length])
  ));

  window.melodyHandoffs =
    detectMelodyHandoffs(
      window.scoreTimeline,
      window.melodyCandidates
    );

  window.handoffDisplayData =
    createHandoffDisplayData(
      window.melodyHandoffs,
      musicXmlScoreData.parts
    );

  window.scoreAnalysisResult =
    createScoreAnalysisResult();

  renderScoreAnalysisResult(window.scoreAnalysisResult);

  console.log("表示先チェック:", {
    panel: !!document.getElementById("score-analysis-panel"),
    roleList: !!document.getElementById("part-role-list"),
    handoffList: !!document.getElementById("melody-handoff-list"),
    panelHidden: document.getElementById("score-analysis-panel")?.hidden,
    roleCount: window.scoreAnalysisResult?.partRoleResults?.length,
    handoffCount: window.scoreAnalysisResult?.handoffDisplayData?.length
  });

  // PDFの各ページに分析結果を再描画
  const scorePages = document.querySelectorAll(".pdf-page");

  scorePages.forEach((pageContainer, index) => {
    renderScoreAnnotations(index + 1, pageContainer);
  });

  console.log("MusicXML解析結果:", musicXmlScoreData);

  if (analysisLoading) {
    analysisLoading.hidden = true;
  }

  console.timeEnd("MusicXML分析全体");
}

// MusicXMLデータを表示
function displayMusicXMLData(data) {
  const container = document.getElementById("musicxml-parts");

  if (!container) return;

  container.innerHTML = "";

  data.parts.forEach(part => {
    const noteCount = part.measures.reduce(
      (total, measure) =>
        total + measure.notes.filter(note => !note.isRest).length,
      0
    );

    const restCount = part.measures.reduce(
      (total, measure) =>
        total + measure.notes.filter(note => note.isRest).length,
      0
    );

    const card = document.createElement("div");
    card.className = "musicxml-part-card";

    const heading = document.createElement("h4");
    heading.textContent = `${part.name}（${part.id}）`;

    const information = document.createElement("p");
    information.textContent =
      `小節数：${part.measures.length} / 音符：${noteCount} / 休符：${restCount}`;

    card.appendChild(heading);
    card.appendChild(information);

    container.appendChild(card);
  });
}

function displayMusicXMLNoteDetails(data) {
  const container = document.getElementById("musicxml-note-details");

  if (!container) return;

  container.innerHTML = "";

  data.parts.forEach(part => {
    const section = document.createElement("section");

    const heading = document.createElement("h4");
    heading.textContent = `${part.name}（${part.id}）`;
    section.appendChild(heading);

    part.measures.forEach(measure => {
      const measureHeading = document.createElement("p");
      measureHeading.textContent = `${measure.number}小節目`;
      section.appendChild(measureHeading);

      measure.notes.forEach(note => {
        const item = document.createElement("p");

        if (note.isRest) {
          item.textContent = "休符";
        } else {
          const accidental =
            note.alter === 1 ? "♯" :
            note.alter === -1 ? "♭" :
            note.alter === 2 ? "𝄪" :
            note.alter === -2 ? "𝄫" : "";

          item.textContent =
            `${note.step}${accidental}${note.octave} / 長さ：${note.duration} / 音符：${note.type || "不明"}`;
        }

        section.appendChild(item);
      });
    });

    container.appendChild(section);
  });
}


// =====================================
// STEP 7：楽器名の手動設定
// =====================================

const instrumentOptions = [
  "フルート",
  "ピッコロ",
  "オーボエ",
  "ファゴット",
  "E♭クラリネット",
  "B♭クラリネット",
  "バスクラリネット",
  "アルトサックス",
  "テナーサックス",
  "バリトンサックス",
  "トランペット",
  "ホルン",
  "トロンボーン",
  "ユーフォニアム",
  "チューバ",
  "コントラバス",
  "打楽器",
  "ピアノ",
  "その他"
];

function displayInstrumentAssignments(data) {
  const container = document.getElementById("musicxml-parts");

  if (!container) return;

  const title = document.createElement("h3");
  title.textContent = "楽器名の設定";
  container.appendChild(title);

  data.parts.forEach(part => {
    const row = document.createElement("div");
    row.className = "instrument-assignment-row";

    const label = document.createElement("label");
    label.textContent = `${part.id}：${part.name}`;

    const select = document.createElement("select");

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "楽器を選択";
    select.appendChild(defaultOption);

    instrumentOptions.forEach(instrument => {
      const option = document.createElement("option");
      option.value = instrument;
      option.textContent = instrument;
      select.appendChild(option);
    });

    // 選択された楽器名をデータに保存
    select.addEventListener("change", () => {
      part.instrument = select.value;
      console.log(`${part.id}：${part.instrument}`);
    });

    row.appendChild(label);
    row.appendChild(select);
    container.appendChild(row);
  });
}


// =====================================
// STEP 8：楽譜の読み取り状態を表示
// =====================================

function displayMusicXMLCheck(data) {
  const container = document.getElementById("musicxml-parts");
  const details = document.getElementById("musicxml-note-details");

  if (!container) return;

  // 以前の詳細表示を消す
  container.innerHTML = "";

  if (details) {
    details.innerHTML = "";
    details.style.display = "none";
  }

  const title = document.createElement("h3");
  title.textContent = "読み取り結果";
  container.appendChild(title);

  // 楽譜データ全体の読み取り状態
  const overall = document.createElement("p");
  overall.textContent = "✓ 楽譜データの読み取りが完了しました";
  overall.className = "read-status-success";
  container.appendChild(overall);

  const partTitle = document.createElement("h4");
  partTitle.textContent = "パート名の認識";
  container.appendChild(partTitle);

  data.parts.forEach(part => {
    const row = document.createElement("div");
    row.className = "instrument-assignment-row";

    const isUnknown =
        !part.name ||
        ["Voice", "Part", "Unknown", "名称未設定"].includes(part.name);

    const label = document.createElement("span");

    label.textContent = isUnknown
        ? `${part.id}：未認識`
        : `${part.id}：${part.name}`;

    if (isUnknown) {
      const status = document.createElement("span");
      status.textContent = "要確認";
      status.className = "read-status-warning";
      row.appendChild(status);

      const select = document.createElement("select");

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "楽器名を選択";
      select.appendChild(defaultOption);

      instrumentOptions.forEach(instrument => {
        const option = document.createElement("option");
        option.value = instrument;
        option.textContent = instrument;
        select.appendChild(option);
      });

      select.addEventListener("change", () => {
        if (!select.value) return;

        part.instrument = select.value;
        label.textContent = `${part.id}：${select.value}`;
        status.textContent = "修正済み";
        status.className = "read-status-success";
      });

      row.appendChild(select);
    } else {
      part.instrument = part.name;

      const status = document.createElement("span");
      status.textContent = "名称取得済み";
      status.className = "read-status-success";
      row.appendChild(status);
    }

    container.appendChild(row);
  });
}

// 分析レイヤーの表示・非表示
const toggleAnalysisButton = document.getElementById(
  "toggle-analysis-layer"
);

let analysisLayerVisible = true;

if (toggleAnalysisButton) {
  toggleAnalysisButton.addEventListener("click", () => {
    analysisLayerVisible = !analysisLayerVisible;

    document.querySelectorAll(".score-overlay").forEach((overlay) => {
      overlay.style.display = analysisLayerVisible ? "block" : "none";
    });

    toggleAnalysisButton.textContent = analysisLayerVisible
      ? "分析結果を非表示"
      : "分析結果を表示";
  });
}

// 分析レイヤーの管理
const analysisLayers = {
  melody: {name:"主旋律", visible:true, color:"#F48FB1"},
  harmony: {name:"ハモリ", visible:true, color:"#FFF176"},
  countermelody: {name:"対旋律", visible:true, color:"#81D4FA"},
  countermelody2: {name:"対旋律2", visible:true, color:"#A5D6A7"},
  bass: {name:"ベース", visible:true, color:"#B39DDB"},
  accompaniment: {name:"伴奏", visible:true, color:"#80CBC4"},
  rhythm: {name:"リズム・打楽器", visible:true, color:"#BDBDBD"},
  arrows: {name:"受け渡し", visible:true, color:"#64B5F6"},
  comments: {name:"コメント", visible:true, color:"#777777"}
};

// 楽譜上に表示する分析結果の保存場所
const scoreAnnotations = {
  melody: [],
  harmony: [],
  countermelody: [],
  countermelody2: [],
  bass: [],
  accompaniment: [],
  rhythm: [],
  arrows: [],
  comments: []
};

// 分析結果を登録する関数
function addScoreAnnotation(layerName, annotation) {
  if (!scoreAnnotations[layerName]) {
    console.error("存在しない分析レイヤーです:", layerName);
    return;
  }

  scoreAnnotations[layerName].push({
    id: crypto.randomUUID(),
    page: annotation.page,
    partId: annotation.partId || null,
    measureIndex: Number.isFinite(annotation.measureIndex)
      ? annotation.measureIndex
      : null,
    x: annotation.x,
    y: annotation.y,
    width: annotation.width || 16,
    height: annotation.height || 12,
    text: annotation.text || "",
    color: annotation.color || analysisLayers[layerName].color
  });
}

// 保存された分析結果を楽譜上に帯状で描画する
function renderScoreAnnotations(pageNumber, pageContainer) {

  // 五線の位置と音符の所属先を再利用する
  let cachedStaffBoxes = null;
  const nearestStaffCache = new Map();

  Object.keys(scoreAnnotations).forEach((layerName) => {

    const canvas = pageContainer.querySelector(
      `.score-overlay[data-layer="${layerName}"]`
    );

    if (!canvas) {
      console.warn("[マーカー描画診断] overlay canvas が見つかりません:", {
        pageNumber,
        layerName,
        selector: `.score-overlay[data-layer="${layerName}"]`
      });
      return;
    }

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!analysisLayers[layerName].visible) {
      console.log("[マーカー描画診断] レイヤー非表示:", layerName);
      return;
    }

    // Sheetscanの元画像サイズを取得
    // musicXmlScoreData は window ではなく、このファイル内の let 変数。
    // window.musicXmlScoreData を参照すると undefined になり、
    // pageLayouts が取得できずマーカー描画が全件スキップされる。
    const musicData =
      musicXmlScoreData || window.currentMusicData;

    const pageLayout =
      musicData?.pageLayouts?.[pageNumber - 1];

    const sourceWidth = pageLayout?.width || canvas.width;
    const sourceHeight = pageLayout?.height || canvas.height;

    const pageAnnotations = scoreAnnotations[layerName]
      .filter(item => item.page === pageNumber);

    // PDF表示サイズに合わせる倍率
    const scaleX = canvas.width / sourceWidth;
    const scaleY = canvas.height / sourceHeight;

    // 座標をPDF表示サイズに変換
    const annotations = scoreAnnotations[layerName]
      .filter(item => item.page === pageNumber)
      .map(item => ({
        ...item,
        x: item.x * scaleX,
        y: item.y * scaleY
      }))
      .sort((a, b) => {
        if (a.partId !== b.partId) {
          return String(a.partId).localeCompare(String(b.partId));
        }
        return a.x - b.x;
      });

    
    
    // 五線の位置は最初の1回だけ計算する
    if (!cachedStaffBoxes) {
      cachedStaffBoxes = (pageLayout?.staffBoxes || []).map(box => ({
        top: box[1] * scaleY,
        bottom: box[3] * scaleY,
        left: box[0] * scaleX,
        right: box[2] * scaleX
      }));
    }

    // 同じパート・同じ小節・同じ五線の音符をまとめる
    const grouped = new Map();

    annotations.forEach(item => {
      if (!cachedStaffBoxes.length) return;

      // 同じY座標の検索結果は再利用
      const yKey = Math.round(item.y);
      let nearestIndex = nearestStaffCache.get(yKey);

      if (nearestIndex === undefined) {
        let nearestDistance = Infinity;
        nearestIndex = -1;

        cachedStaffBoxes.forEach((staff, index) => {
          const center = (staff.top + staff.bottom) / 2;
          const distance = Math.abs(item.y - center);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });

        nearestStaffCache.set(yKey, nearestIndex);
      }

      if (nearestIndex < 0) return;

      const measureKey = item.measureIndex === null
        ? `note-${item.x}`
        : item.measureIndex;
      const key = `${item.partId}_${nearestIndex}_${measureKey}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          staff: cachedStaffBoxes[nearestIndex],
          items: [],
          color: item.color
        });
      }

      grouped.get(key).items.push(item);
    });

    // 小節内の音符位置をもとに、1小節につき1本の帯を描く
    context.globalAlpha = 0.28;

    grouped.forEach(group => {
      const { staff, items, color } = group;
      const xs = items.map(item => item.x);
      const firstX = Math.min(...xs);
      const lastX = Math.max(...xs);

      // 音符の少ない小節でも見えるよう、左右に少し余白を付ける
      const startX = Math.max(staff.left, firstX - 18);
      const endX = Math.min(staff.right, lastX + 18);

      if (endX <= startX) return;

      context.fillStyle = color;
      context.fillRect(
        startX,
        staff.top,
        endX - startX,
        staff.bottom - staff.top
      );
    });

    console.log("[マーカー描画診断]", {
      pageNumber,
      layerName,
      registered: scoreAnnotations[layerName].length,
      pageMatched: pageAnnotations.length,
      canvas: { width: canvas.width, height: canvas.height },
      pageLayout: pageLayout ? {
        width: pageLayout.width,
        height: pageLayout.height,
        staffBoxesType: Array.isArray(pageLayout.staffBoxes) ? "array" : typeof pageLayout.staffBoxes,
        staffBoxesCount: pageLayout.staffBoxes?.length || 0,
        firstStaffBox: pageLayout.staffBoxes?.[0] || null
      } : null,
      scale: { scaleX, scaleY },
      firstAnnotation: annotations[0] || null,
      groupedCount: grouped.size,
      firstGroupStaff: grouped.values().next().value?.staff || null
    });

    context.globalAlpha = 1;

    // コメントは従来どおり表示
    annotations.forEach(item => {
      if (!item.text) return;

      context.font = "16px sans-serif";
      context.fillStyle = item.color;
      context.fillText(item.text, item.x + 12, item.y + 5);
    });

  });
}

// 分析レイヤーの種類別表示設定
const analysisLayerSettings = document.getElementById(
  "analysis-layer-settings"
);

if (analysisLayerSettings) {
  analysisLayerSettings.addEventListener("change", (event) => {
    const layerName = event.target.dataset.layer;

    if (!layerName || !analysisLayers[layerName]) return;

    analysisLayers[layerName].visible = event.target.checked;

    document.querySelectorAll(
      `.score-overlay[data-layer="${layerName}"]`
    ).forEach((overlay) => {
      overlay.style.display = event.target.checked ? "block" : "none";
    });
  });
}

function createScoreAnalysisResult() {
  return {
    timeline: window.scoreTimeline || [],

    simultaneous: window.simultaneousAnalysis || [],

    partFeatures: window.partFeatures || [],

    roleSuggestions: window.partRoleSuggestions || [],

    melodicMotion: window.melodicMotionAnalysis || [],

    melodyCandidates: window.melodyCandidates || [],

    partRelationships: window.partRelationships || [],

    counterMelody: window.counterMelodyAnalysis || [],

    overlapping: window.overlappingAnalysis || [],

    melodyOverlapRoles: window.melodyOverlapRoles || [],

    rhythmRelationships: window.rhythmRelationships || [],

    partRoleResults: window.partRoleResults || [],

    melodyHandoffs: window.melodyHandoffs || [],

    handoffDisplayData: window.handoffDisplayData || [],
  };
}

function detectInstrumentFamily(name) {
  const value = String(name || "").toLowerCase();

  if (/piccolo|flute|フルート|ピッコロ/.test(value)) {
    return "woodwind";
  }

  if (/clarinet|クラリネット|oboe|オーボエ|bassoon|ファゴット/.test(value)) {
    return "woodwind";
  }

  if (/saxophone|sax|サックス/.test(value)) {
    return "woodwind";
  }

  if (/trumpet|cornet|トランペット|コルネット/.test(value)) {
    return "brass";
  }

  if (/horn|ホルン/.test(value)) {
    return "brass";
  }

  if (/trombone|トロンボーン|euphonium|ユーフォニアム|tuba|チューバ/.test(value)) {
    return "brass";
  }

  if (/percussion|drum|timpani|打楽器|ティンパニ/.test(value)) {
    return "percussion";
  }

  if (/violin|viola|cello|contrabass|ヴァイオリン|ビオラ|チェロ|コントラバス/.test(value)) {
    return "strings";
  }

  if (/piano|keyboard|ピアノ|キーボード/.test(value)) {
    return "keyboard";
  }

  if (/voice|vocal|choir|声楽|合唱/.test(value)) {
    return "voice";
  }

  return "unknown";
}

function getInstrumentRange(name) {
  const value = String(name || "").toLowerCase();

  // MIDI音高（中央ドを60とする）
  const ranges = [
    { pattern: /piccolo|ピッコロ/, min: 74, max: 108 },
    { pattern: /flute|フルート/, min: 60, max: 98 },
    { pattern: /oboe|オーボエ/, min: 58, max: 93 },
    { pattern: /bassoon|ファゴット/, min: 34, max: 75 },
    { pattern: /bass clarinet|バスクラリネット/, min: 37, max: 77 },
    { pattern: /clarinet|クラリネット/, min: 50, max: 89 },
    { pattern: /alto sax|アルトサックス/, min: 49, max: 80 },
    { pattern: /tenor sax|テナーサックス/, min: 44, max: 76 },
    { pattern: /baritone sax|バリトンサックス/, min: 37, max: 72 },
    { pattern: /saxophone|sax|サックス/, min: 44, max: 80 },
    { pattern: /trumpet|トランペット/, min: 54, max: 86 },
    { pattern: /horn|ホルン/, min: 42, max: 84 },
    { pattern: /trombone|トロンボーン/, min: 40, max: 70 },
    { pattern: /euphonium|ユーフォニアム/, min: 40, max: 70 },
    { pattern: /tuba|チューバ/, min: 26, max: 65 }
  ];

  const matched = ranges.find(item =>
    item.pattern.test(value)
  );

  return matched
    ? { min: matched.min, max: matched.max }
    : null;
}

function analyzeRhythmRelationships(events) {
  const parts = new Map();

  events.forEach(event => {
    if (
      event.isRest ||
      event.isGrace ||
      !Number.isFinite(event.onsetBeats) ||
      !Number.isFinite(event.durationBeats) ||
      event.durationBeats <= 0
    ) {
      return;
    }

    if (!parts.has(event.partId)) {
      parts.set(event.partId, {
        partName: event.partName,
        measures: new Map()
      });
    }

    const part = parts.get(event.partId);

    if (!part.measures.has(event.measureIndex)) {
      part.measures.set(event.measureIndex, new Set());
    }

    // 同時に鳴る和音は同じリズムとして扱う
    const rhythmKey = [
      event.onsetBeats.toFixed(3),
      event.durationBeats.toFixed(3)
    ].join("_");

    part.measures.get(event.measureIndex).add(rhythmKey);
  });

  const partList = Array.from(parts.entries());
  const results = [];

  for (let i = 0; i < partList.length; i++) {
    for (let j = i + 1; j < partList.length; j++) {
      const [partAId, partA] = partList[i];
      const [partBId, partB] = partList[j];

      let comparedMeasures = 0;
      let matchingMeasures = 0;
      let totalSimilarity = 0;

      partA.measures.forEach((rhythmA, measureIndex) => {
        const rhythmB = partB.measures.get(measureIndex);

        if (!rhythmB) return;

        comparedMeasures++;

        const intersection = [...rhythmA].filter(key =>
          rhythmB.has(key)
        ).length;

        const union = new Set([
          ...rhythmA,
          ...rhythmB
        ]).size;

        const similarity = union
          ? intersection / union
          : 0;

        totalSimilarity += similarity;

        if (similarity >= 0.8) {
          matchingMeasures++;
        }
      });

      if (comparedMeasures === 0) continue;

      results.push({
        partAId,
        partAName: partA.partName,
        partBId,
        partBName: partB.partName,
        comparedMeasures,
        matchingMeasures,
        rhythmSimilarity:
          totalSimilarity / comparedMeasures
      });
    }
  }

  return results.sort((a, b) =>
    b.rhythmSimilarity - a.rhythmSimilarity
  );
}

function classifyPartRoles(analysis) {
  const features = analysis.partFeatures || [];
  const melodies = analysis.melodyCandidates || [];
  const counterMelodies = analysis.counterMelody || [];
  const rhythms = analysis.rhythmRelationships || [];

  const melodyIds = new Set(
    melodies
      .filter(item => item.candidate)
      .map(item => item.partId)
  );

  const lowestPart = [...features]
    .filter(part => Number.isFinite(part.averagePitch))
    .sort((a, b) => a.averagePitch - b.averagePitch)[0];

  return features.map(part => {
    const roles = [];

    const melody = melodies.find(
      item => item.partId === part.partId
    );

    const counterResults = counterMelodies.filter(
      item => item.otherPartId === part.partId &&
        item.comparedCount >= 3
    );

    const counterScore = counterResults.filter(
      item => item.relationship === "反対方向の動きが多い"
    ).length;

    const rhythmResults = rhythms.filter(item =>
      (item.partAId === part.partId &&
        melodyIds.has(item.partBId)) ||
      (item.partBId === part.partId &&
        melodyIds.has(item.partAId))
    );

    const rhythmSimilarity = rhythmResults.length
      ? Math.max(
          ...rhythmResults.map(item => item.rhythmSimilarity)
        )
      : null;

    if (melody?.candidate) {
      roles.push("主旋律候補");
    }

    if (
      lowestPart?.partId === part.partId &&
      features.length > 1
    ) {
      roles.push("ベース候補");
    }

    if (
      !melodyIds.has(part.partId) &&
      counterScore > 0
    ) {
      roles.push("対旋律候補");
    }

    if (
      !melodyIds.has(part.partId) &&
      rhythmSimilarity !== null &&
      rhythmSimilarity >= 0.6
    ) {
      roles.push("リズム伴奏候補");
    }

    return {
      partId: part.partId,
      partName: part.partName,
      roles,
      melodyScore: melody?.melodyScore ?? null,
      rhythmSimilarity
    };
  });
}

// 小節ごとに役割を分析する
// 音の動きが少ない小節では、前後1小節を旋律の動きの参考にする。
// ただし、音域・音符数などの基本特徴と同時演奏の分析は対象小節を中心に判定する。
function analyzeMeasureRoleResults(scoreTimeline, globalPartFeatures, globalRoleResults) {
  const measureIndexes = [...new Set(
    scoreTimeline.map(event => event.measureIndex)
  )].sort((a, b) => a - b);

  const globalFeatureMap = new Map(
    (globalPartFeatures || []).map(part => [part.partId, part])
  );
  const globalRoleMap = new Map(
    (globalRoleResults || []).map(part => [part.partId, part.roles || []])
  );

  return measureIndexes.map(measureIndex => {
    const measureEvents = scoreTimeline.filter(
      event => event.measureIndex === measureIndex
    );

    // 前後の小節は、旋律の動きや対旋律の比較材料としてのみ利用する。
    const contextEvents = scoreTimeline.filter(
      event => Math.abs(event.measureIndex - measureIndex) <= 1
    );

    const localFeatures = analyzePartFeatures(measureEvents).map(part => {
      const globalFeature = globalFeatureMap.get(part.partId);
      return {
        ...part,
        instrumentRange: globalFeature?.instrumentRange ?? null,
        inRangeRatio: globalFeature?.inRangeRatio ?? null
      };
    });

    // 小節内の声部情報も独立して保持する。
    // 役割判定は既存のパート単位ロジックを維持し、次段階で声部単位へ
    // 細分化できるように、音符数・音域・休符数を小節ごとに記録する。
    const localVoiceFeatures = analyzeVoiceFeatures(measureEvents).map(voice => ({
      ...voice,
      measureIndex,
      measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1)
    }));

    const motionAnalysis = analyzeMelodicMotion(contextEvents);
    const melodyCandidates = rankMelodyCandidates(
      localFeatures,
      motionAnalysis
    );

    const simultaneousAnalysis = analyzeSimultaneousEvents(measureEvents);
    const counterMelody = analyzeCounterMelodyCandidates(
      contextEvents,
      melodyCandidates
    );
    const rhythmRelationships = analyzeRhythmRelationships(measureEvents);

    const roles = classifyPartRoles({
      partFeatures: localFeatures,
      melodyCandidates,
      counterMelody,
      rhythmRelationships
    }).map(part => ({
      ...part,
      measureIndex,
      measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
      // 全体分析の役割は参考情報として保持し、小節ごとの判定を固定しない。
      globalReferenceRoles: globalRoleMap.get(part.partId) || []
    }));

    // パート役割を声部へ安全に引き継ぐ。
    // 同じパートに複数声部がある場合、パート全体の役割を各声部へ
    // コピーすると誤判定になるため、声部別判定ができるまでは保留する。
    const voicesByPart = new Map();
    localVoiceFeatures.forEach(voice => {
      if (!voicesByPart.has(voice.partId)) voicesByPart.set(voice.partId, []);
      voicesByPart.get(voice.partId).push(voice);
    });

    const voiceRoleResults = localVoiceFeatures.map(voice => {
      const siblingVoices = voicesByPart.get(voice.partId) || [];
      const parentPart = roles.find(part => part.partId === voice.partId);
      const canInheritPartRole = siblingVoices.length === 1;

      return {
        voiceKey: voice.voiceKey,
        partId: voice.partId,
        partName: voice.partName,
        staff: voice.staff,
        voice: voice.voice,
        measureIndex,
        measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
        roles: canInheritPartRole ? (parentPart?.roles || []) : [],
        status: canInheritPartRole ? "part-role-inherited" : "pending-voice-level-analysis",
        reason: canInheritPartRole
          ? "この小節では同一パート内に声部が1つのため、パート役割を引き継ぎ"
          : "同一パート内に複数声部があるため、誤った役割の引き継ぎを防いで保留"
      };
    });

    return {
      measureIndex,
      measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
      roles,
      melodyCandidates,
      simultaneousAnalysis,
      voiceFeatures: localVoiceFeatures,
      voiceRoleResults
    };
  });
}

// パートの役割と音符の位置情報から色分けデータを作成
function createRoleAnnotationData() {
  const events = window.scoreTimeline || [];
  const measureResults = window.measureRoleResults || [];

  const roleLayerMap = {
    "主旋律候補": "melody",
    "ハモリ候補": "harmony",
    "対旋律候補": "countermelody",
    "対旋律候補2": "countermelody2",
    "ベース候補": "bass",
    "伴奏候補": "accompaniment",
    "リズム伴奏候補": "accompaniment",
    "リズム・打楽器候補": "rhythm"
  };

  const annotations = [];

  measureResults.forEach(measureResult => {
    measureResult.roles.forEach(part => {
      if (!part.roles || !part.roles.length) return;

      const layers = part.roles
        .map(role => roleLayerMap[role])
        .filter(Boolean);

      if (!layers.length) return;

      const partEvents = events.filter(event =>
        event.partId === part.partId &&
        event.measureIndex === measureResult.measureIndex &&
        !event.isRest &&
        event.imagePosition &&
        Number.isFinite(event.imagePosition.page) &&
        Number.isFinite(event.imagePosition.x) &&
        Number.isFinite(event.imagePosition.y)
      );

      partEvents.forEach(event => {
        layers.forEach(layerName => {
          const layer = analysisLayers[layerName];
          if (!layer || !scoreAnnotations[layerName]) return;

          annotations.push({
            layerName,
            color: layer.color,
            partId: event.partId,
            measureIndex: event.measureIndex,
            page: event.imagePosition.page,
            x: event.imagePosition.x,
            y: event.imagePosition.y,
            noteName: event.noteName,
            measureNumber: event.measureNumber
          });
        });
      });
    });
  });

  // 作成した注釈を各レイヤーに振り分ける
  Object.keys(scoreAnnotations).forEach(layerName => {
    scoreAnnotations[layerName] = [];
  });

  annotations.forEach(annotation => {
    if (scoreAnnotations[annotation.layerName]) {
      scoreAnnotations[annotation.layerName].push(annotation);
    }
  });

  return annotations;
}

// 役割ごとの色分けデータを表示用レイヤーに登録
function applyRoleAnnotationData() {
  const annotations = window.scoreRoleAnnotations || [];

  const roleLayers = [
    "melody",
    "harmony",
    "countermelody",
    "countermelody2",
    "bass",
    "accompaniment",
    "rhythm"
  ];

  // 役割レイヤーの古いデータをクリア
  roleLayers.forEach(layerName => {
    if (scoreAnnotations[layerName]) {
      scoreAnnotations[layerName] = [];
    }
  });

  // 新しい色分けデータを登録
  annotations.forEach(annotation => {
    const layerName = annotation.layerName;

    if (!scoreAnnotations[layerName]) return;

    addScoreAnnotation(layerName, {
      page: annotation.page,
      partId: annotation.partId,
      x: annotation.x,
      y: annotation.y,
      measureIndex: annotation.measureIndex,
      text: ""
    });
  });
}

function detectMelodyHandoffs(events, melodyCandidates) {
  const candidateIds = new Set(
    (melodyCandidates || [])
      .filter(item => item.candidate)
      .map(item => item.partId)
  );

  const notes = (events || [])
    .filter(event =>
      !event.isRest &&
      !event.isGrace &&
      candidateIds.has(event.partId) &&
      Number.isFinite(event.concertMidiNumber) &&
      Number.isFinite(event.onsetBeats) &&
      Number.isFinite(event.durationBeats)
    )
    .sort((a, b) =>
      a.measureIndex - b.measureIndex ||
      a.onsetBeats - b.onsetBeats
    );

  const handoffs = [];
  const handoffKeys = new Set();

  for (let i = 0; i < notes.length; i++) {
    const current = notes[i];

    const currentEnd =
      current.onsetBeats + current.durationBeats;

    const next = notes.find(event =>
      event.measureIndex === current.measureIndex &&
      event.partId !== current.partId &&
      event.onsetBeats >= currentEnd &&
      event.onsetBeats - currentEnd <= 1
    );

    if (!next) continue;

    const pitchDifference = Math.abs(
      next.concertMidiNumber - current.concertMidiNumber
    );

    const timeDifference =
      next.onsetBeats - currentEnd;

    if (pitchDifference <= 7) {
      const handoffKey = [
        current.measureIndex,
        current.partId,
        next.partId,
        current.onsetBeats,
        next.onsetBeats
      ].join("_");

      if (handoffKeys.has(handoffKey)) {
        continue;
      }

      handoffKeys.add(handoffKey);

      handoffs.push({
        measureIndex: current.measureIndex,
        measureNumber: current.measureNumber,
        fromPartId: current.partId,
        toPartId: next.partId,
        fromPitch: current.concertMidiNumber,
        toPitch: next.concertMidiNumber,
        timeDifference,
        pitchDifference,
        confidence: "候補"
      });
    }
  }

  return handoffs;
}

function createHandoffDisplayData(handoffs, parts) {
  return (handoffs || [])
    .slice()
    .sort((a, b) =>
      a.measureIndex - b.measureIndex ||
      (a.timeDifference || 0) - (b.timeDifference || 0)
    )
    .map((item, index) => {
      const fromPart = (parts || []).find(
        part => (part.id || part.partId) === item.fromPartId
      );

      const toPart = (parts || []).find(
        part => (part.id || part.partId) === item.toPartId
      );

      const fromName =
        fromPart?.name || fromPart?.partName || item.fromPartId;

      const toName =
        toPart?.name || toPart?.partName || item.toPartId;

      return {
        id: `handoff-${index + 1}`,
        measureIndex: item.measureIndex,
        measureNumber: item.measureNumber || item.measureIndex + 1,
        fromPartId: item.fromPartId,
        fromPartName: fromName,
        toPartId: item.toPartId,
        toPartName: toName,
        fromPitch: item.fromPitch,
        toPitch: item.toPitch,
        pitchDifference: item.pitchDifference,
        confidence: item.confidence,
        displayText: `${fromName} → ${toName}`
      };
    });
}

function getIntervalName(semitones) {
  const intervals = {
    0: "同音",
    1: "短2度",
    2: "長2度",
    3: "短3度",
    4: "長3度",
    5: "完全4度",
    6: "増4度・減5度",
    7: "完全5度",
    8: "短6度",
    9: "長6度",
    10: "短7度",
    11: "長7度",
    12: "完全8度"
  };

  return intervals[semitones] || `${semitones}半音`;
}

function renderScoreAnalysisResult(result) {
  const panel = document.getElementById("score-analysis-panel");
  const roleList = document.getElementById("part-role-list");
  const handoffList = document.getElementById("melody-handoff-list");
  const emptyState = document.getElementById("analysis-empty-state");

  if (!panel || !roleList || !handoffList) {
    return;
  }

  const allRoles = result?.partRoleResults || [];
  const handoffs = result?.handoffDisplayData || [];

  const roleFilter = document.getElementById("part-role-filter");
  const selectedRole = roleFilter?.value || "all";

  const roles = selectedRole === "all"
    ? allRoles
    : allRoles.filter(part =>
        Array.isArray(part.roles) &&
        part.roles.includes(selectedRole)
      );

  roleList.replaceChildren();
  handoffList.replaceChildren();

  if (allRoles.length === 0 && handoffs.length === 0) {
    panel.hidden = true;

    if (emptyState) {
      emptyState.hidden = false;
    }

    return;
  }

  // パートごとの役割を表示
  if (roles.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "analysis-empty-message";
    emptyMessage.textContent = "該当するパートがありません。";
    roleList.appendChild(emptyMessage);
  } else {
    roles.forEach(part => {
      const item = document.createElement("div");
      item.className = "analysis-item";

      const title = document.createElement("div");
      title.className = "analysis-item-title";
      title.textContent = part.partName || part.partId;

      const detail = document.createElement("div");
      detail.className = "analysis-role-tags";

      if (Array.isArray(part.roles) && part.roles.length) {
        part.roles.forEach(role => {
          const tag = document.createElement("span");
          tag.className = "analysis-role-tag";

          if (role === "主旋律候補") {
            tag.classList.add("role-melody");
          } else if (role === "対旋律候補") {
            tag.classList.add("role-counter");
          } else if (role === "ベース候補") {
            tag.classList.add("role-bass");
          } else if (role === "リズム伴奏候補") {
            tag.classList.add("role-rhythm");
          }

          tag.textContent = role;
          detail.appendChild(tag);
        });
      } else {
        const unknown = document.createElement("span");
        unknown.className = "analysis-item-detail";
        unknown.textContent = "役割未判定";
        unknown.classList.add("role-unknown");
        detail.appendChild(unknown);
      }

      item.append(title, detail);
      roleList.appendChild(item);
    });
  }

  // 旋律の受け渡し候補を表示
  if (handoffs.length === 0) {
    handoffList.textContent = "旋律の受け渡し候補はありません。";
  } else {
    handoffs.forEach(handoff => {
      const item = document.createElement("div");
      item.className = "analysis-item";

      const title = document.createElement("div");
      title.className = "handoff-flow";

      const from = document.createElement("span");
      from.className = "handoff-part";
      from.textContent = handoff.fromPartName;

      const arrow = document.createElement("span");
      arrow.className = "handoff-arrow";
      arrow.textContent = "→";

      const to = document.createElement("span");
      to.className = "handoff-part";
      to.textContent = handoff.toPartName;

      title.append(from, arrow, to);

      const detail = document.createElement("div");
      detail.className = "analysis-item-detail";
      detail.textContent =
        `${handoff.measureNumber}小節目・${getIntervalName(handoff.pitchDifference)}・受け渡し候補`;

      item.append(title, detail);
      handoffList.appendChild(item);
    });
  }

  const loading = document.getElementById("analysis-loading");

  if (loading) {
    loading.hidden = true;
  }

  panel.hidden = false;

  if (emptyState) {
    emptyState.hidden = true;
  }
}

function resetScoreAnalysisDisplay() {
  const panel = document.getElementById("score-analysis-panel");
  const roleList = document.getElementById("part-role-list");
  const handoffList = document.getElementById("melody-handoff-list");
  const emptyState = document.getElementById("analysis-empty-state");
  const loading = document.getElementById("analysis-loading");

  if (loading) {
    loading.hidden = true;
  }

  if (panel) {
    panel.hidden = true;
  }

  if (roleList) {
    roleList.replaceChildren();
  }

  if (handoffList) {
    handoffList.replaceChildren();
  }

  if (emptyState) {
    emptyState.hidden = false;
  }

  window.partRoleResults = [];
  window.measureRoleResults = [];
  window.scoreRoleAnnotations = [];
  window.melodyHandoffs = [];
  window.handoffDisplayData = [];
  window.scoreAnalysisResult = null;
}

// 分析画面を開いたときに分析結果を再表示
document.querySelectorAll('[data-screen="analysis"]').forEach(button => {
  button.addEventListener("click", () => {
    if (window.scoreAnalysisResult) {
      renderScoreAnalysisResult(window.scoreAnalysisResult);
    }
  });
});

const partRoleFilter = document.getElementById("part-role-filter");

if (partRoleFilter) {
  partRoleFilter.addEventListener("change", () => {
    if (window.scoreAnalysisResult) {
      renderScoreAnalysisResult(window.scoreAnalysisResult);
    }
  });
}

// ========================================
// PDF・画像の自動認識エンジン接続
// ========================================

let runAutomaticRecognition = null;

// 分析画面の進行状況を更新
function setAnalysisProgress(message, percent = null) {
  const loading = document.getElementById("analysis-loading");
  const text = loading?.querySelector("p");
  const bar = document.getElementById("analysis-progress-bar");
  const percentText = document.getElementById("analysis-progress-percent");
  const track = document.getElementById("analysis-progress-track");

  if (text) {
    text.textContent = message;
  }

  if (percent !== null) {
    const value = Math.max(0, Math.min(100, percent));

    if (bar) {
      bar.style.width = value + "%";
    }

    if (percentText) {
      percentText.textContent = Math.round(value) + "%";
    }

    if (track) {
      track.setAttribute("aria-valuenow", String(Math.round(value)));
    }
  }
}

const automaticRecognitionInput =
  document.getElementById("score-file-input");

if (automaticRecognitionInput) {

  runAutomaticRecognition = async () => {
    const files = Array.from(automaticRecognitionInput.files || []);
    if (!files.length) return;

    const file = files[0];
    const isPdf = file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    const isImage = file.type.startsWith("image/") ||
      /\.(png|jpe?g)$/i.test(file.name);
    
    if (!isPdf && !isImage) return;

setAnalysisProgress("楽譜を読み込んでいます…");

try {

  const { recognizeScoreFiles } =
    await import("../engine/score-compass-engine.js");

  console.time("① OMR認識");

  const xml = await recognizeScoreFiles(
    files,
    (message, percent) => {
      setAnalysisProgress(message, percent);
    },
    ({ pageIndex, total, xml: partialXml }) => {
      // The worker sends a cumulative MusicXML after each completed page.
      // Analyze it immediately so already-read pages can receive provisional markers.
      try {
        musicXmlScoreData = parseMusicXML(partialXml);
        runMusicXMLAnalysis();
        console.log(
          `ページ ${pageIndex + 1}/${total} までの暫定分析を表示しました。`
        );
      } catch (pageError) {
        console.warn(
          `ページ ${pageIndex + 1} の暫定分析を表示できませんでした。`,
          pageError
        );
      }
    }
  );

  console.timeEnd("① OMR認識");

  // 認識結果を直接解析する
  console.time("② MusicXML解析");

  musicXmlScoreData = parseMusicXML(xml);

  console.timeEnd("② MusicXML解析");

  setAnalysisProgress(
    "認識結果から分析データを作成しています…",
    98
  );

  console.time("③ MusicXML分析");

  runMusicXMLAnalysis();

  console.timeEnd("③ MusicXML分析");

    } catch (error) {
      console.error("自動楽譜認識エラー:", error);

      setAnalysisProgress(
        "認識に失敗しました: " +
        (error?.message || "原因不明のエラー")
      );
    }
  };
}

