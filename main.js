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
    
    // 新しい楽譜では、最初の描画を全ページ対象にする。
    // 前の楽譜のページ署名も引き継がない。
    window.scoreAnnotationRenderInitialized = false;
    window.scoreRenderedAnnotationSignatures = new Map();

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
    Number.isFinite(part.averagePitch) && part.noteCount > 0
  );
  if (validParts.length === 0) return [];

  // 声部ごとの旋律特徴をパート単位に集約する。
  // 高音域であること自体は、メロディーの根拠にしない。
  const motionByPart = new Map();
  motionAnalysis.forEach(item => {
    if (!motionByPart.has(item.partId)) {
      motionByPart.set(item.partId, {
        intervalCount: 0, weightedStepwise: 0,
        leapCount: 0, directionChanges: 0
      });
    }
    const result = motionByPart.get(item.partId);
    result.intervalCount += item.intervalCount;
    result.weightedStepwise += item.stepwiseRatio * item.intervalCount;
    result.leapCount += item.leapCount;
    result.directionChanges += item.directionChanges;
  });

  return validParts.map(part => {
    const motion = motionByPart.get(part.partId);
    const intervalCount = motion?.intervalCount || 0;
    const stepwiseRatio = intervalCount
      ? motion.weightedStepwise / intervalCount : 0;
    const leapRatio = intervalCount ? motion.leapCount / intervalCount : 0;
    const directionChangeRatio = intervalCount > 1
      ? motion.directionChanges / (intervalCount - 1) : 0;

    // 旋律候補は「音が高い」「音符が多い」だけでは選ばない。
    // 順次進行・自然な方向転換・過度でない跳躍・十分な連続性を評価する。
    const score =
      stepwiseRatio * 0.45 +
      Math.min(directionChangeRatio, 0.5) * 0.35 +
      (1 - Math.min(leapRatio, 1)) * 0.20;

    // 小節単独では音程数が少なくなるため、短い輪郭も暫定候補として残す。
    // 最終的な採用は、後段の複数小節フレーズ継続・他パートとの照合で補強する。
    const enoughContour = intervalCount >= 2;
    const hasMelodicShape =
      stepwiseRatio >= 0.30 || motion?.directionChanges >= 1;
    const candidate = Boolean(
      enoughContour && hasMelodicShape && score >= 0.40
    );

    return {
      partId: part.partId,
      partName: part.partName,
      melodyScore: Math.round(score * 100),
      candidate,
      evidence: {
        intervalCount,
        stepwiseRatio: Number(stepwiseRatio.toFixed(3)),
        directionChanges: motion?.directionChanges || 0,
        leapRatio: Number(leapRatio.toFixed(3)),
        pitchUsedAsPositiveEvidence: false
      }
    };
  }).sort((a, b) => b.melodyScore - a.melodyScore);
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
function runMusicXMLAnalysis({ provisional = false } = {}) {

  console.time("MusicXML分析全体");
  const previousAnalysisStatus = window.scoreAnalysisStatus || "none";
  window.scoreAnalysisStatus = provisional ? "provisional" : "final";

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

  // 全パートのフレーズ類似・主題再現を先に横断評価し、役割判定へ渡す。
  window.phraseRelationshipAnalysis = analyzePhraseRelationships(window.scoreTimeline);

  window.partRelationships =
    analyzePartRelationships(
      window.simultaneousAnalysis,
      window.melodyCandidates,
      window.measureRoleResults,
      window.phraseRelationshipAnalysis
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
      rhythmRelationships: window.rhythmRelationships,
      events: window.scoreTimeline,
      phraseAnalysis: window.phraseRelationshipAnalysis
    });

  // 全体分析を参考情報として残しつつ、小節ごとの役割を判定する。
  window.measureRoleResults = analyzeMeasureRoleResults(
    window.scoreTimeline,
    window.partFeatures,
    window.partRoleResults,
    window.phraseRelationshipAnalysis
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
      noteCount: voice.noteCount,
      restCount: voice.restCount,
      candidateScores: voice.candidateScores,
      roleEvidence: voice.roleEvidence,
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

  // 仮判定・最終判定のどちらも、最新の注釈データで置き換える。
  // applyRoleAnnotationData は変更があったページだけを返す。
  const changedAnnotationPages = applyRoleAnnotationData();
  window.scoreAnalysisRevision = (window.scoreAnalysisRevision || 0) + 1;
  console.log("分析判定状態:", {
    status: window.scoreAnalysisStatus,
    previousStatus: previousAnalysisStatus,
    revision: window.scoreAnalysisRevision,
    changedPages: changedAnnotationPages
  });

  console.log("[マーカー登録診断]", Object.fromEntries(
    Object.entries(scoreAnnotations).map(([name, items]) => [name, items.length])
  ));

  window.melodyHandoffs =
    detectMelodyHandoffs(
      window.scoreTimeline,
      window.melodyCandidates,
      window.measureRoleResults,
      window.phraseRelationshipAnalysis
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

  // マーカーに変更があったページだけ再描画する。
  // 古いマーカーの削除も、該当ページのcanvasをクリアしてから描き直すことで反映する。
  const changedPageSet = new Set(changedAnnotationPages);
  const scorePages = document.querySelectorAll(".pdf-page");

  scorePages.forEach((pageContainer, index) => {
    const pageNumber = index + 1;
    if (changedPageSet.has(pageNumber)) {
      renderScoreAnnotations(pageNumber, pageContainer);
    }
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

// STEP28: 同じ五線上で役割マーカーが重ならないよう、描画前に帯を統合・整理する。
// 解析結果そのものは変更せず、表示用の帯だけを正規化する。
function buildNonOverlappingRoleBands(pageNumber, pageLayout, scaleX, scaleY) {
  const staffBoxes = (pageLayout?.staffBoxes || []).map(box => ({
    top: box[1] * scaleY,
    bottom: box[3] * scaleY,
    left: box[0] * scaleX,
    right: box[2] * scaleX
  }));
  if (!staffBoxes.length) return [];

  const roleGroups = new Map();
  Object.entries(scoreAnnotations).forEach(([layerName, items]) => {
    if (!['melody','harmony','countermelody','countermelody2','bass','accompaniment','rhythm'].includes(layerName)) return;
    items.filter(item => item.page === pageNumber).forEach(item => {
      const x = Number(item.x) * scaleX;
      const y = Number(item.y) * scaleY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      let staffIndex = -1;
      let nearest = Infinity;
      staffBoxes.forEach((staff, index) => {
        const distance = Math.abs(y - (staff.top + staff.bottom) / 2);
        if (distance < nearest) { nearest = distance; staffIndex = index; }
      });
      if (staffIndex < 0) return;
      const measureIndex = Number.isFinite(item.measureIndex) ? item.measureIndex : Math.round(x);
      const key = `${item.partId || ''}|${staffIndex}|${measureIndex}|${layerName}`;
      if (!roleGroups.has(key)) roleGroups.set(key, {
        layerName, partId: item.partId || '', staffIndex, measureIndex,
        staff: staffBoxes[staffIndex], xs: [], count: 0
      });
      const group = roleGroups.get(key);
      group.xs.push(x);
      group.count++;
    });
  });

  const byMeasure = new Map();
  roleGroups.forEach(group => {
    const key = `${group.partId}|${group.staffIndex}|${group.measureIndex}`;
    if (!byMeasure.has(key)) byMeasure.set(key, []);
    byMeasure.get(key).push(group);
  });

  // 同じパート・五線・小節に複数役割が重なった場合、音符の支持数が最多の役割を表示する。
  // 同数ならメロディー等の優先順位で決め、複数色の重ね塗りを避ける。
  const rolePriority = ['melody','bass','harmony','countermelody','countermelody2','accompaniment','rhythm'];
  const selected = [];
  byMeasure.forEach(groups => {
    groups.sort((a,b) => b.count - a.count || rolePriority.indexOf(a.layerName) - rolePriority.indexOf(b.layerName));
    const winner = groups[0];
    const firstX = Math.min(...winner.xs);
    const lastX = Math.max(...winner.xs);
    const startX = Math.max(winner.staff.left, firstX - 18);
    const endX = Math.min(winner.staff.right, lastX + 18);
    if (endX > startX) selected.push({ ...winner, startX, endX });
  });

  // 同じパート・五線の隣接小節の帯が余白で重なる場合、境界を中点にそろえる。
  const byStaff = new Map();
  selected.forEach(band => {
    const key = `${band.partId}|${band.staffIndex}`;
    if (!byStaff.has(key)) byStaff.set(key, []);
    byStaff.get(key).push(band);
  });
  byStaff.forEach(bands => {
    bands.sort((a,b) => a.measureIndex - b.measureIndex);
    for (let i = 0; i < bands.length - 1; i++) {
      const left = bands[i];
      const right = bands[i + 1];
      if (right.measureIndex === left.measureIndex) continue;
      if (left.endX > right.startX) {
        const boundary = (left.endX + right.startX) / 2;
        left.endX = Math.max(left.startX, boundary);
        right.startX = Math.min(right.endX, boundary);
      }
    }
  });
  return selected.filter(band => band.endX > band.startX);
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
    const pageRoleBands = buildNonOverlappingRoleBands(
      pageNumber, pageLayout, canvas.width / sourceWidth, canvas.height / sourceHeight
    );

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

    // STEP28: 全役割レイヤーを横断して整理済みの帯だけを描画する。
    // 同じ場所への重ね塗りを避け、隣接小節の余白も境界で分割する。
    context.globalAlpha = 0.28;
    const bandsForLayer = pageRoleBands.filter(band => band.layerName === layerName);
    bandsForLayer.forEach(band => {
      context.fillStyle = analysisLayers[layerName].color;
      context.fillRect(
        band.startX,
        band.staff.top,
        band.endX - band.startX,
        band.staff.bottom - band.staff.top
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
      renderedRoleBandCount: bandsForLayer.length
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

function analyzeNonMelodyRoleEvidence(events, melodyCandidates) {
  const usable = (events || []).filter(event =>
    !event.isRest && !event.isGrace &&
    Number.isFinite(event.concertMidiNumber) &&
    Number.isFinite(event.onsetBeats)
  );
  const melodyIds = new Set((melodyCandidates || [])
    .filter(item => item.candidate).map(item => item.partId));
  const byPart = new Map();
  const byOnset = new Map();

  usable.forEach(event => {
    if (!byPart.has(event.partId)) byPart.set(event.partId, []);
    byPart.get(event.partId).push(event);
    const key = `${event.measureIndex}_${event.onsetBeats.toFixed(3)}`;
    if (!byOnset.has(key)) byOnset.set(key, []);
    byOnset.get(key).push(event);
  });

  const melodyOnsets = new Map();
  usable.filter(event => melodyIds.has(event.partId)).forEach(event => {
    const key = `${event.measureIndex}_${event.onsetBeats.toFixed(3)}`;
    if (!melodyOnsets.has(key)) melodyOnsets.set(key, []);
    melodyOnsets.get(key).push(event);
  });

  const lowestOnsets = new Map();
  byOnset.forEach((group, key) => {
    const lowest = Math.min(...group.map(event => event.concertMidiNumber));
    lowestOnsets.set(key, lowest);
  });

  const results = new Map();
  byPart.forEach((partEvents, partId) => {
    const sorted = [...partEvents].sort((a,b) =>
      a.measureIndex - b.measureIndex || a.onsetBeats - b.onsetBeats
    );
    const onsetGroups = new Map();
    sorted.forEach(event => {
      const key = `${event.measureIndex}_${event.onsetBeats.toFixed(3)}`;
      if (!onsetGroups.has(key)) onsetGroups.set(key, []);
      onsetGroups.get(key).push(event);
    });
    const uniqueOnsets = [...onsetGroups.keys()];
    const pitches = sorted.map(event => event.concertMidiNumber);
    let repeatedPitchCount = 0;
    for (let i=1; i<pitches.length; i++) {
      if (pitches[i] === pitches[i-1]) repeatedPitchCount++;
    }
    const intervals = [];
    for (let i=1; i<uniqueOnsets.length; i++) {
      const a = uniqueOnsets[i-1].split('_');
      const b = uniqueOnsets[i].split('_');
      if (a[0] !== b[0]) continue;
      const delta = Number(b[1]) - Number(a[1]);
      if (delta > 0) intervals.push(Number(delta.toFixed(3)));
    }
    const intervalCounts = new Map();
    intervals.forEach(value => intervalCounts.set(value, (intervalCounts.get(value)||0)+1));
    const repeatedRhythmRatio = intervals.length
      ? Math.max(0, ...intervalCounts.values()) / intervals.length : 0;
    const chordOnsetCount = [...onsetGroups.values()].filter(group =>
      new Set(group.map(event => event.concertMidiNumber)).size >= 2
    ).length;

    let lowestCount = 0;
    let alignedCount = 0;
    let distinctPitchCount = 0;
    let melodyPitchDistanceTotal = 0;
    let melodyPitchDistanceCount = 0;
    let comparedMelodyCount = 0;
    uniqueOnsets.forEach(key => {
      const group = onsetGroups.get(key);
      const lowest = lowestOnsets.get(key);
      if (group.some(event => event.concertMidiNumber === lowest)) lowestCount++;
      const melodyGroup = melodyOnsets.get(key);
      if (!melodyGroup || melodyGroup.length === 0 || melodyIds.has(partId)) return;
      alignedCount++;
      comparedMelodyCount++;
      const ownPitches = group.map(event => event.concertMidiNumber);
      const melodyPitches = melodyGroup.map(event => event.concertMidiNumber);
      const distances = ownPitches.flatMap(own =>
        melodyPitches.map(main => Math.abs(own - main))
      ).filter(distance => distance > 0);
      if (distances.length) {
        distinctPitchCount++;
        melodyPitchDistanceTotal += Math.min(...distances);
        melodyPitchDistanceCount++;
      }
    });

    const durations = sorted.map(event => event.durationBeats).filter(Number.isFinite);
    const shortNoteRatio = durations.length
      ? durations.filter(duration => duration <= 0.5).length / durations.length : 0;
    const averageDuration = durations.length
      ? durations.reduce((a,b)=>a+b,0) / durations.length : 0;
    const lowPositionRatio = uniqueOnsets.length ? lowestCount / uniqueOnsets.length : 0;
    const melodyAlignmentRatio = comparedMelodyCount
      ? alignedCount / Math.max(1, uniqueOnsets.length) : 0;
    const distinctPitchRatio = comparedMelodyCount
      ? distinctPitchCount / comparedMelodyCount : 0;

    results.set(partId, {
      noteCount: sorted.length,
      onsetCount: uniqueOnsets.length,
      repeatedPitchRatio: sorted.length > 1 ? repeatedPitchCount/(sorted.length-1) : 0,
      repeatedRhythmRatio,
      chordOnsetRatio: uniqueOnsets.length ? chordOnsetCount/uniqueOnsets.length : 0,
      shortNoteRatio,
      averageDuration,
      lowPositionRatio,
      melodyAlignmentRatio,
      distinctPitchRatio,
      melodyPitchDistanceAverage: melodyPitchDistanceCount
        ? melodyPitchDistanceTotal / melodyPitchDistanceCount : null,
      melodyComparisons: comparedMelodyCount
    });
  });
  return results;
}

// STEP18: 小節境界をまたぐフレーズを同じ時間軸で扱うための拍位置変換。
// 休符も含む全イベントから各小節の長さを推定し、小節内拍を曲全体の通し拍へ変換する。
function buildMeasureBeatOffsets(events) {
  const measureLengths = new Map();
  (events || []).forEach(event => {
    if (!Number.isFinite(event.measureIndex) ||
        !Number.isFinite(event.onsetBeats) ||
        !Number.isFinite(event.durationBeats) || event.durationBeats <= 0) return;
    const end = event.onsetBeats + event.durationBeats;
    measureLengths.set(event.measureIndex,
      Math.max(measureLengths.get(event.measureIndex) || 0, end));
  });
  const indexes = [...measureLengths.keys()].sort((a,b)=>a-b);
  const positiveLengths = indexes.map(index=>measureLengths.get(index)).filter(v=>v>0).sort((a,b)=>a-b);
  const fallbackLength = positiveLengths.length
    ? positiveLengths[Math.floor(positiveLengths.length/2)] : 4;
  const offsets = new Map();
  let running = 0;
  let previousIndex = null;
  indexes.forEach(index => {
    if (previousIndex !== null && index > previousIndex + 1) {
      running += fallbackLength * (index - previousIndex - 1);
    }
    offsets.set(index, running);
    running += measureLengths.get(index) || fallbackLength;
    previousIndex = index;
  });
  return { offsets, lengths: measureLengths, fallbackLength };
}

// STEP13-18: 全パートを同時に評価するためのフレーズ特徴・役割スコア基盤。
// 1小節で強制分割せず、実際の休符・時間的な空白を境界としてフレーズを作る。
function buildPartPhraseWindows(events, minNotes = 4, maxNotes = 10) {
  const timeline = buildMeasureBeatOffsets(events);
  const byVoice = new Map();
  (events || []).forEach(event => {
    if (event.isRest || event.isGrace || !Number.isFinite(event.concertMidiNumber) ||
        !Number.isFinite(event.onsetBeats) || !Number.isFinite(event.measureIndex)) return;
    const voiceKey = getScoreVoiceKey(event);
    if (!byVoice.has(voiceKey)) byVoice.set(voiceKey, []);
    const globalBeat = (timeline.offsets.get(event.measureIndex) || 0) + event.onsetBeats;
    byVoice.get(voiceKey).push({ ...event, globalBeat, voiceKey });
  });
  const windows = [];
  byVoice.forEach((items, voiceKey) => {
    const partId = items[0]?.partId;
    const sorted = [...items].sort((a,b) => a.globalBeat - b.globalBeat ||
      a.concertMidiNumber - b.concertMidiNumber);
    // 同一声部で同時に鳴る和音は旋律の音程列に混ぜない。
    const onsetGroups = new Map();
    sorted.forEach(event => {
      const key = event.globalBeat.toFixed(5);
      if (!onsetGroups.has(key)) onsetGroups.set(key, []);
      onsetGroups.get(key).push(event);
    });
    const melodicNotes = [...onsetGroups.values()]
      .filter(group => group.length === 1)
      .map(group => group[0]);
    const segments = [];
    let segment = [];
    melodicNotes.forEach(event => {
      const previous = segment[segment.length - 1];
      const previousEnd = previous
        ? previous.globalBeat + Math.max(0.05, previous.durationBeats || 0.25) : null;
      const gap = previous ? event.globalBeat - previousEnd : 0;
      // 小節境界そのものでは分割しない。長い休符・空白のみで区切る。
      if (previous && gap > 1.5) {
        if (segment.length >= minNotes) segments.push(segment);
        segment = [];
      }
      segment.push(event);
    });
    if (segment.length >= minNotes) segments.push(segment);
    segments.forEach(notes => {
      const stride = Math.max(1, maxNotes - 2);
      const starts = notes.length <= maxNotes
        ? [0]
        : Array.from({length: Math.ceil((notes.length - maxNotes) / stride) + 1}, (_,i)=>i*stride);
      const finalStart = Math.max(0, notes.length - maxNotes);
      if (!starts.includes(finalStart)) starts.push(finalStart);
      [...new Set(starts)].forEach(start => {
        const slice = notes.slice(start, Math.min(notes.length, start + maxNotes));
        if (slice.length < minNotes) return;
        const intervals = [];
        const rhythm = [];
        for (let i=1;i<slice.length;i++) {
          intervals.push(slice[i].concertMidiNumber - slice[i-1].concertMidiNumber);
          rhythm.push(Math.max(0.05, slice[i].globalBeat - slice[i-1].globalBeat));
        }
        const base = rhythm.length ? rhythm.reduce((a,b)=>a+b,0)/rhythm.length : 1;
        const last = slice[slice.length-1];
        windows.push({
          partId, voiceKey, partName: slice[0].partName || '',
          startMeasure: slice[0].measureIndex, endMeasure: last.measureIndex,
          startBeat: slice[0].onsetBeats, endBeat: last.onsetBeats,
          startGlobalBeat: slice[0].globalBeat,
          endGlobalBeat: last.globalBeat + Math.max(0.05, last.durationBeats || 0.25),
          notes: slice.length, intervals,
          encodedIntervals: intervals.map(v => ({
            direction: v === 0 ? 0 : Math.sign(v),
            size: Math.abs(v) <= 2 ? 0 : (Math.abs(v) <= 5 ? 1 : 2)
          })),
          contour: intervals.map(v => v===0 ? 0 : Math.sign(v)),
          rhythm: rhythm.map(v => v/base),
          durations: slice.map(e => Math.max(0.05, e.durationBeats || 0.25)),
          pitches: slice.map(e => e.concertMidiNumber)
        });
      });
    });
  });
  return windows;
}

// フレーズの音符数が違っても比較できる簡易DP照合。
// 移調・オクターブ差は音程輪郭で吸収し、リズム比率も別に評価する。
function comparePhraseWindows(a, b) {
  if (!a || !b || !Array.isArray(a.intervals) || !Array.isArray(b.intervals) ||
      a.intervals.length < 3 || b.intervals.length < 3) return 0;

  // 移調・オクターブ差に左右されにくい音程輪郭を比較する。
  // 局所アラインメントにより、片方だけに装飾音・省略音がある場合も照合する。
  const encode = values => values.map(v => ({
    direction: v === 0 ? 0 : Math.sign(v),
    size: Math.abs(v) <= 2 ? 0 : (Math.abs(v) <= 5 ? 1 : 2)
  }));
  const x = a.encodedIntervals || encode(a.intervals);
  const y = b.encodedIntervals || encode(b.intervals);
  const cols = y.length + 1;
  // 局所DPは直前行と現在行だけで計算できるため、行列全体を確保しない。
  let previousRow = Array(cols).fill(0);
  let currentRow = Array(cols).fill(0);
  let best = 0;
  for (let i = 1; i <= x.length; i++) {
    currentRow.fill(0);
    for (let j = 1; j < cols; j++) {
      const xd = x[i - 1], yd = y[j - 1];
      const directionCost = xd.direction === yd.direction ? 0 :
        (xd.direction === 0 || yd.direction === 0 ? 0.42 : 1);
      const sizeCost = xd.size === yd.size ? 0 : 0.42;
      const ar = a.rhythm?.[Math.min(i - 1, (a.rhythm || []).length - 1)] || 1;
      const br = b.rhythm?.[Math.min(j - 1, (b.rhythm || []).length - 1)] || 1;
      const rhythmCost = Math.min(0.38, Math.abs(Math.log(ar / br)) * 0.16);
      const matchCost = directionCost * 0.68 + sizeCost * 0.20 + rhythmCost * 0.12;
      // 一音の追加・省略はギャップとして許容するが、連続した不一致は類似度を下げる。
      currentRow[j] = Math.max(0,
        previousRow[j - 1] + (1 - matchCost),
        previousRow[j] - 0.48,
        currentRow[j - 1] - 0.48
      );
      if (currentRow[j] > best) best = currentRow[j];
    }
    const swap = previousRow;
    previousRow = currentRow;
    currentRow = swap;
  }
  const shorter = Math.min(x.length, y.length);
  const longer = Math.max(x.length, y.length);
  const localCoverage = best / Math.max(1, shorter);
  const lengthRatio = shorter / Math.max(1, longer);

  // リズムの骨格は比較するが、音価の細分化・簡略化は許容する。
  // 局所一致だけで無関係な長い音型を結び付けないよう、全体の輪郭も照合する。
  const alignedCount = Math.max(x.length, y.length);
  let globalAgreement = 0;
  for (let k = 0; k < alignedCount; k++) {
    const xi = Math.min(x.length - 1, Math.floor(k * x.length / alignedCount));
    const yi = Math.min(y.length - 1, Math.floor(k * y.length / alignedCount));
    const direction = x[xi].direction === y[yi].direction ? 1 :
      (x[xi].direction === 0 || y[yi].direction === 0 ? 0.45 : 0);
    const size = x[xi].size === y[yi].size ? 1 : 0.35;
    globalAgreement += direction * 0.75 + size * 0.25;
  }
  globalAgreement /= alignedCount;

  const rhythmA = a.rhythm || [], rhythmB = b.rhythm || [];
  let rhythmSimilarity = 0.5;
  if (rhythmA.length && rhythmB.length) {
    const count = Math.min(rhythmA.length, rhythmB.length);
    let rhythmError = 0;
    for (let i = 0; i < count; i++) {
      const ratio = Math.max(0.05, rhythmA[i]) / Math.max(0.05, rhythmB[i]);
      const octaveEquivalent = Math.min(ratio, 1 / ratio);
      // 1:2 / 2:1 の細分化・簡略化は部分一致として評価。
      const distance = Math.min(Math.abs(Math.log2(octaveEquivalent)),
        Math.abs(Math.log2(octaveEquivalent / 0.5)) * 0.55);
      rhythmError += Math.min(1, distance);
    }
    rhythmSimilarity = 1 - rhythmError / count;
  }
  return Math.max(0, Math.min(1,
    localCoverage * 0.38 + globalAgreement * 0.34 +
    lengthRatio * 0.12 + rhythmSimilarity * 0.16
  ));
}

function analyzePhraseRelationships(events) {
  const windows=buildPartPhraseWindows(events);
  const matchesByPair=new Map();
  // 役割グループ判定用には、表示・補助スコア用の上限付き一覧とは別に
  // 類似度0.90以上の全一致を保持する（同一パート間24件上限の影響を受けない）。
  const strongGroupMatches=[];
  const recurrenceByPart=new Map();
  const melodyThemeByPart=new Map();
  const recurrenceCountByPart=new Map();
  const crossPartThemeByPart=new Map();
  const byPart=new Map(), byMeasure=new Map();
  windows.forEach((window,index)=>{
    if(!byPart.has(window.partId)) byPart.set(window.partId,[]);
    byPart.get(window.partId).push({window,index});
    if(!byMeasure.has(window.startMeasure)) byMeasure.set(window.startMeasure,[]);
    byMeasure.get(window.startMeasure).push({window,index});
  });
  const compared=new Set();
  const comparePair=(left,right)=>{
    if(left.index===right.index) return;
    const lo=Math.min(left.index,right.index), hi=Math.max(left.index,right.index);
    const pairKey=`${lo}:${hi}`;
    if(compared.has(pairKey)) return;
    compared.add(pairKey);
    const a=left.window,b=right.window;
    const samePart=a.partId===b.partId;
    const sameVoice=a.voiceKey===b.voiceKey;
    if(sameVoice && a.startMeasure===b.startMeasure) return;
    // 同じ声部のスライド窓が時間的に重なる場合は、同一フレーズの一部分同士を
    // 再現として数えない。独立した再現だけを比較対象にし、無意味なDP照合も省く。
    if(sameVoice && Number.isFinite(a.startGlobalBeat) && Number.isFinite(b.startGlobalBeat) &&
      Number.isFinite(a.endGlobalBeat) && Number.isFinite(b.endGlobalBeat) &&
      a.startGlobalBeat < b.endGlobalBeat && b.startGlobalBeat < a.endGlobalBeat) return;
    const similarity=comparePhraseWindows(a,b);
    if(similarity<0.82) return;
    const match={windowIndexA:left.index,windowIndexB:right.index,partAId:a.partId,partBId:b.partId,voiceAKey:a.voiceKey,voiceBKey:b.voiceKey,measureA:a.startMeasure,measureB:b.startMeasure,measureAEnd:a.endMeasure,measureBEnd:b.endMeasure,startGlobalBeatA:a.startGlobalBeat,endGlobalBeatA:a.endGlobalBeat,startGlobalBeatB:b.startGlobalBeat,endGlobalBeatB:b.endGlobalBeat,similarity,samePart,sameVoice};
    if (similarity >= 0.90) strongGroupMatches.push(match);
    const bucketKey=samePart?`self:${a.partId}`:[a.partId,b.partId].sort().join('|');
    if(!matchesByPair.has(bucketKey)) matchesByPair.set(bucketKey,[]);
    const bucket=matchesByPair.get(bucketKey);
    if(bucket.length<24) bucket.push(match);
    else {
      const lowestIndex=bucket.reduce((best,item,index)=>item.similarity<bucket[best].similarity?index:best,0);
      if(similarity>bucket[lowestIndex].similarity) bucket[lowestIndex]=match;
    }
    if(sameVoice) {
      recurrenceByPart.set(a.partId,Math.max(recurrenceByPart.get(a.partId)||0,similarity));
      recurrenceCountByPart.set(a.partId,(recurrenceCountByPart.get(a.partId)||0)+1);
    } else {
      const key=[a.partId,b.partId].sort().join('|');
      melodyThemeByPart.set(key,Math.max(melodyThemeByPart.get(key)||0,similarity));
      [a.partId,b.partId].forEach(id=>crossPartThemeByPart.set(id,
        Math.max(crossPartThemeByPart.get(id)||0,similarity)));
    }
  };
  byPart.forEach(items=>{
    for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++) comparePair(items[i],items[j]);
  });
  byMeasure.forEach((items,measure)=>{
    for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++) comparePair(items[i],items[j]);
    const next=byMeasure.get(measure+1)||[];
    items.forEach(a=>next.forEach(b=>comparePair(a,b)));
  });
  // 離れた小節で別パートへ受け渡された主題も拾うため、3音程の小さな指紋で候補を絞る。
  // 一致指紋は候補抽出にだけ使い、最終的な一致判定はDP照合で行う。
  const byGram=new Map();
  windows.forEach((window,index)=>{
    for(let i=0;i<=window.intervals.length-3;i++) {
      const gram=window.intervals.slice(i,i+3).map(v=>`${v===0?0:Math.sign(v)}:${Math.abs(v)<=2?0:(Math.abs(v)<=5?1:2)}`).join(',');
      if(!byGram.has(gram)) byGram.set(gram,[]);
      byGram.get(gram).push({window,index});
    }
  });
  byGram.forEach(items=>{
    const unique=[...new Map(items.map(item=>[item.index,item])).values()];
    for(let i=0;i<unique.length;i++) for(let j=i+1;j<unique.length;j++) {
      if(unique[i].window.partId!==unique[j].window.partId) comparePair(unique[i],unique[j]);
    }
  });
  const matches=[...matchesByPair.values()].flat();
  return {windows,matches,groupMatches:strongGroupMatches,recurrenceByPart,recurrenceCountByPart,
    melodyThemeByPart,crossPartThemeByPart};
}

// フレーズ一致が、現在分析している小節範囲に実際に重なるかを確認する。
// 隣接小節や別区間の一致が、現在の小節の役割へ漏れることを防ぐ。
function phraseMatchOverlapsMeasureRange(match, side, minMeasure, maxMeasure) {
  const startKey = side === "A" ? "measureA" : "measureB";
  const endKey = side === "A" ? "measureAEnd" : "measureBEnd";
  const start = Number.isFinite(match?.[startKey]) ? match[startKey] : null;
  const end = Number.isFinite(match?.[endKey]) ? match[endKey] : start;
  if (start === null || end === null || !Number.isFinite(minMeasure) || !Number.isFinite(maxMeasure)) {
    return false;
  }
  return end >= minMeasure && start <= maxMeasure;
}

function analyzeParallelRoleScores(analysis, roleEvidence, melodyCandidates, counterMelodies, rhythmRelationships) {
  const events=analysis.events || [];
  const phrase=analysis.phraseAnalysis || analyzePhraseRelationships(events);
  const melodyMap=new Map((melodyCandidates||[]).map(x=>[x.partId,x]));
  const globalRoleMap=new Map((analysis.globalRoleResults||[]).map(item=>[item.partId,item.roles||[]]));
  const isMelodyAnchor=id=>Boolean(melodyMap.get(id)?.candidate || globalRoleMap.get(id)?.includes('主旋律候補'));
  const phraseMelodySupport=new Map();
  const voiceScoped = events.some(event => event.originalPartId !== undefined);
  const phraseEntityIds = match => voiceScoped
    ? [match.voiceAKey || match.partAId, match.voiceBKey || match.partBId]
    : [match.partAId, match.partBId];
  const phraseIsSameEntity = match => voiceScoped ? Boolean(match.sameVoice) : Boolean(match.samePart);
  const activeMeasures = events.map(event => event.measureIndex).filter(Number.isFinite);
  const activeMinMeasure = activeMeasures.length ? Math.min(...activeMeasures) : null;
  const activeMaxMeasure = activeMeasures.length ? Math.max(...activeMeasures) : null;
  const phraseSideInContext = (match, side) => {
    if (activeMinMeasure === null || activeMaxMeasure === null) return false;
    return phraseMatchOverlapsMeasureRange(match, side, activeMinMeasure, activeMaxMeasure);
  };
  phrase.matches.forEach(match=>{
    if(phraseIsSameEntity(match)) return;
    const [entityA, entityB] = phraseEntityIds(match);
    const a=isMelodyAnchor(entityA), b=isMelodyAnchor(entityB);
    if(a && !b && phraseSideInContext(match, 'B'))
      phraseMelodySupport.set(entityB,Math.max(phraseMelodySupport.get(entityB)||0,match.similarity));
    if(b && !a && phraseSideInContext(match, 'A'))
      phraseMelodySupport.set(entityA,Math.max(phraseMelodySupport.get(entityA)||0,match.similarity));
  });
  const counterMap=new Map();
  (counterMelodies||[]).forEach(x=>{
    if(x.relationship==='反対方向の動きが多い' && x.comparedCount>=3)
      counterMap.set(x.otherPartId,Math.max(counterMap.get(x.otherPartId)||0,0.72));
  });
  const rhythmMap=new Map();
  (rhythmRelationships||[]).forEach(x=>{
    const sim=Number(x.rhythmSimilarity)||0;
    [x.partAId,x.partBId].forEach(id=>rhythmMap.set(id,Math.max(rhythmMap.get(id)||0,sim)));
  });
  const usable=events.filter(e=>!e.isRest&&!e.isGrace&&Number.isFinite(e.concertMidiNumber));
  const pitchByOnset=new Map();
  usable.forEach(e=>{
    const k=`${e.measureIndex}_${e.onsetBeats.toFixed(3)}`;
    if(!pitchByOnset.has(k)) pitchByOnset.set(k,[]);
    pitchByOnset.get(k).push(e);
  });
  const allPitches=usable.map(e=>e.concertMidiNumber).sort((a,b)=>a-b);
  const medianPitch=allPitches.length?allPitches[Math.floor(allPitches.length/2)]:60;
  const scores=new Map();
  (analysis.partFeatures||[]).forEach(part=>{
    const ev=usable.filter(e=>e.partId===part.partId);
    const evidence=roleEvidence.get(part.partId)||{};
    const melody=melodyMap.get(part.partId);
    const recurrence=phrase.recurrenceByPart.get(part.partId)||0;
    const recurrenceCount=phrase.recurrenceCountByPart?.get(part.partId)||0;
    const crossPartTheme=phrase.crossPartThemeByPart?.get(part.partId)||0;
    const ownPitches=ev.sort((a,b)=>a.measureIndex-b.measureIndex||a.onsetBeats-b.onsetBeats)
      .map(e=>e.concertMidiNumber);
    const ownIntervals=ownPitches.slice(1).map((p,i)=>p-ownPitches[i]).filter(v=>v!==0);
    const ownSteps=ownIntervals.filter(v=>Math.abs(v)<=2).length;
    let ownTurns=0;
    for(let i=1;i<ownIntervals.length;i++) if(Math.sign(ownIntervals[i])!==Math.sign(ownIntervals[i-1])) ownTurns++;
    const contour=ownIntervals.length?ownSteps/ownIntervals.length:0;
    const directional=Math.min(1,ownTurns/4);
    const phraseSupport=phraseMelodySupport.get(part.partId)||0;
    const globalMelodyAnchor=globalRoleMap.get(part.partId)?.includes('主旋律候補');
    const melodyBase=melody?.candidate
      ? Math.max(0.52,(Number(melody.melodyScore)||0)/100)
      : (part.noteCount>=4 && (contour>=0.35 || ownTurns>=2) ? 0.30+contour*0.20+directional*0.10 : (globalMelodyAnchor ? 0.36 : 0));
    // 主題の再現は旋律性を補強するが、反復伴奏を主旋律と誤認しないよう
    // 単独では候補化せず、旋律輪郭・既存候補・他パートとの照合と組み合わせる。
    const recurrenceBoost = recurrenceCount >= 2 && contour >= 0.30
      ? Math.min(0.10, recurrence * 0.10) : 0;
    const crossThemeBoost = crossPartTheme >= 0.88 && contour >= 0.30
      ? Math.min(0.08, (crossPartTheme - 0.82) * 0.35) : 0;
    const phraseBoost=Math.min(0.26,
      Math.max(recurrence,phraseSupport)*0.20 + recurrenceBoost + crossThemeBoost);
    let harmony=0, melodyAligned=0, intervalStable=0, compared=0;
    let bassLow=0;
    ev.forEach(e=>{
      const k=`${e.measureIndex}_${e.onsetBeats.toFixed(3)}`;
      const group=pitchByOnset.get(k)||[];
      const other=group.filter(o=>o.partId!==part.partId);
      if(other.length) {
        compared++;
        const distances=other.map(o=>Math.abs(o.concertMidiNumber-e.concertMidiNumber));
        if(distances.some(d=>d>=3 && d<=12)) harmony++;
        if(group.some(o=>o.partId!==part.partId && o.concertMidiNumber>e.concertMidiNumber)) bassLow++;
      }
      if(group.length>=3) melodyAligned++;
    });
    const harmonyRatio=compared?harmony/compared:0;
    const stablePitch=evidence.melodyPitchDistanceAverage;
    intervalStable=Number.isFinite(stablePitch)&&stablePitch>=3&&stablePitch<=12?0.8:0;
    // 主旋律と同時に動く割合を使い、単なる同時発音とハモリを区別する。
    const alignment = Number(evidence.melodyAlignmentRatio) || 0;
    const harmonyMotionSupport = Math.min(1, alignment * 0.65 + intervalStable * 0.35);
    const percussion=/perc|drum|timp|cymbal|snare|tambour|打楽器|ティンパニ|シンバル|スネア|バスドラム/i.test(`${part.partName||''} ${part.instrument||''}`);
    const short=evidence.shortNoteRatio||0;
    const repeated=evidence.repeatedRhythmRatio||0;
    const chord=evidence.chordOnsetRatio||0;
    // 音域の低さだけではベースと判定しない。
    // 実際に同時発音の中で最低音を担う割合を使い、音の長さ・音域の広さは補助材料に留める。
    const lowPositionRatio=Number(evidence.lowPositionRatio)||0;
    const bassMotion=ev.length>3?Math.min(1,(new Set(ev.map(e=>Math.round(e.concertMidiNumber/12))).size)/3):0;
    // 旋律候補・全体分析の主旋律判定・強いフレーズ一致がある場合、
    // 低音域であってもベース判定が主旋律を上回らないようにする。
    const hasMelodicEvidence=Boolean(
      melody?.candidate || globalMelodyAnchor || phraseSupport>=0.88 ||
      (Number(melody?.evidence?.intervalCount)>=4 && Number(melody?.melodyScore)>=48)
    );
    // ベースは長音である必要はない。四分音符などの短めの進行でも、
    // 同時発音内で最低音を担い、和声進行に沿って動くなら十分な根拠とする。
    const bassDurationSupport = evidence.averageDuration
      ? Math.min(1, evidence.averageDuration / 1.0) : 0;
    const rawBassScore=Math.min(0.94,
      0.10 + 0.58*lowPositionRatio +
      0.10*bassDurationSupport +
      0.16*bassMotion
    );
    const bassScore=hasMelodicEvidence ? Math.min(0.48,rawBassScore) : rawBassScore;
    const partScores={
      '主旋律候補':Math.min(0.98,melodyBase+phraseBoost),
      'ハモリ候補':Math.min(0.94,0.14+0.28*harmonyRatio+0.34*harmonyMotionSupport+0.24*alignment),
      '対旋律候補':(melody?.candidate || phraseSupport>=0.78) ? 0 : Math.min(0.94,Math.max(counterMap.get(part.partId)||0,0.20+0.34*contour+0.20*directional+0.26*(1-Math.max(evidence.melodyAlignmentRatio||0,phraseSupport)))),
      '伴奏候補':Math.min(0.94,0.16+0.34*chord+0.28*repeated+0.22*(evidence.repeatedPitchRatio||0)),
      'ベース候補':bassScore,
      'リズム・打楽器候補':percussion?1:((evidence.repeatedPitchRatio||0)>=0.30 && short>=0.40 ? Math.min(0.88,0.10+0.24*short+0.24*repeated+0.42*(evidence.repeatedPitchRatio||0)) : 0)
    };
    // 閾値未満の根拠も、同一フレーズの別パートと照合するために保持する。
    // 単独では役割に採用せず、強い一致相手と独立根拠がそろった場合だけ後段で補強する。
    const supportScores = {...partScores};
    const thresholds={'主旋律候補':0.52,'ハモリ候補':0.56,'対旋律候補':0.56,'伴奏候補':0.56,'ベース候補':0.58,'リズム・打楽器候補':percussion?0.5:0.64};
    Object.keys(partScores).forEach(role=>{if(partScores[role]<thresholds[role]) delete partScores[role];});
    scores.set(part.partId,{candidateScores:partScores,supportScores,phraseRecurrence:recurrence,
      phraseRecurrenceCount:recurrenceCount,crossPartThemeSupport:crossPartTheme,phraseMatches:phrase.matches.filter(m=>m.partAId===part.partId||m.partBId===part.partId),medianPitch});
  });
  return {scores,phrase};
}

// STEP22: 相互一致するフレーズ窓を、重複のない完全リンク群へまとめる。
// 連結しているだけのA-B-Cを同一群にせず、群を結合する際は全ての交差ペアを確認する。
function buildPhraseMatchGroups(matches, windows, events, threshold = 0.90) {
  const voiceScoped = (events || []).some(event => event.originalPartId !== undefined);
  const entityIds = (windows || []).map(window => {
    if (!window) return null;
    return voiceScoped ? (window.voiceKey || window.partId) : window.partId;
  });
  const pairSimilarity = new Map();
  const validMatches = (matches || []).filter(match =>
    Number.isInteger(match.windowIndexA) && Number.isInteger(match.windowIndexB) &&
    match.windowIndexA !== match.windowIndexB &&
    match.windowIndexA >= 0 && match.windowIndexB >= 0 &&
    match.windowIndexA < entityIds.length && match.windowIndexB < entityIds.length &&
    Number(match.similarity) >= threshold
  );
  validMatches.forEach(match => {
    const a = match.windowIndexA, b = match.windowIndexB;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    pairSimilarity.set(key, Math.max(pairSimilarity.get(key) || 0, Number(match.similarity)));
  });
  const clusters = [];
  const indexes = new Set();
  validMatches.forEach(match => {
    indexes.add(match.windowIndexA);
    indexes.add(match.windowIndexB);
  });
  [...indexes].forEach(index => clusters.push([index]));
  const clusterFor = new Map();
  const refreshIndex = () => {
    clusterFor.clear();
    clusters.forEach((cluster, clusterIndex) => cluster.forEach(index => clusterFor.set(index, clusterIndex)));
  };
  refreshIndex();
  const sortedMatches = [...validMatches].sort((a, b) => Number(b.similarity) - Number(a.similarity));
  sortedMatches.forEach(match => {
    const a = match.windowIndexA, b = match.windowIndexB;
    const leftIndex = clusterFor.get(a), rightIndex = clusterFor.get(b);
    if (leftIndex === undefined || rightIndex === undefined || leftIndex === rightIndex) return;
    const left = clusters[leftIndex], right = clusters[rightIndex];
    const combined = [...left, ...right];
    const entities = combined.map(index => entityIds[index]).filter(Boolean);
    if (entities.length !== combined.length || new Set(entities).size !== entities.length) return;
    const allCrossPairsMatch = left.every(x => right.every(y => {
      const key = x < y ? `${x}:${y}` : `${y}:${x}`;
      return (pairSimilarity.get(key) || 0) >= threshold;
    }));
    if (!allCrossPairsMatch) return;
    clusters[leftIndex] = combined;
    clusters.splice(rightIndex, 1);
    refreshIndex();
  });
  return clusters.filter(cluster => cluster.length >= 2);
}

function classifyPartRoles(analysis) {
  const features = analysis.partFeatures || [];
  const melodies = analysis.melodyCandidates || [];
  const counterMelodies = analysis.counterMelody || [];
  const rhythms = analysis.rhythmRelationships || [];
  const roleEvidence = analyzeNonMelodyRoleEvidence(analysis.events || [], melodies);
  const parallel = analyzeParallelRoleScores(analysis, roleEvidence, melodies, counterMelodies, rhythms);

  const classified = features.map(part => {
    const melody = melodies.find(item => item.partId === part.partId);
    const evidence = roleEvidence.get(part.partId) || {};
    const parallelResult = parallel.scores.get(part.partId) || {candidateScores:{},phraseRecurrence:0,phraseMatches:[]};
    const candidateScores = {...parallelResult.candidateScores};
    const rankedCandidates = Object.entries(candidateScores).sort((a,b)=>b[1]-a[1]);
    const selectedRole = rankedCandidates.length ? rankedCandidates[0][0] : null;
    return {
      partId: part.partId,
      partName: part.partName,
      roles: selectedRole ? [selectedRole] : [],
      melodyScore: melody?.melodyScore ?? null,
      melodyEvidence: melody?.evidence ?? null,
      roleEvidence: evidence,
      candidateScores,
      roleSupportScores: parallelResult.supportScores || {},
      selectedRole,
      phraseRecurrence: parallelResult.phraseRecurrence,
      phraseRecurrenceCount: parallelResult.phraseRecurrenceCount || 0,
      crossPartThemeSupport: parallelResult.crossPartThemeSupport || 0,
      phraseMatches: parallelResult.phraseMatches,
      rhythmSimilarity: rhythms.filter(item => item.partAId===part.partId || item.partBId===part.partId)
        .reduce((best,item)=>Math.max(best,Number(item.rhythmSimilarity)||0),0)
    };
  });

  // STEP29: フレーズ一致の役割補強を強化（独立根拠・競合役割の条件は維持）。
  // STEP21: フレーズ窓を相互一致するグループとして扱い、グループ単位で役割整合性を確認する。
  // 単独の高類似ペアから役割を伝播させず、グループ内の全ペアに強い一致がある場合だけ採用。
  const roleKeys = [
    '主旋律候補', 'ハモリ候補', '対旋律候補',
    '伴奏候補', 'ベース候補', 'リズム・打楽器候補'
  ];
  const roleThresholds = {
    '主旋律候補': 0.52, 'ハモリ候補': 0.56, '対旋律候補': 0.56,
    '伴奏候補': 0.56, 'ベース候補': 0.58, 'リズム・打楽器候補': 0.64
  };
  const roleByPart = new Map(classified.map(item => [item.partId, item]));
  const phrase = parallel.phrase;
  const allPhraseMatches = phrase?.groupMatches || (phrase?.matches || []);
  const windows = phrase?.windows || [];
  // 全曲フレーズ分析の一致を、そのまま各小節へ流用すると、
  // 別の小節で成立した役割が現在の小節へ漏れ込む。
  // 小節分析時は、照合された両方のフレーズが現在の分析範囲に
  // 実際に重なる一致だけを、役割整合性の根拠として使う。
  const activeMeasureValues = (analysis.events || []).map(event => event.measureIndex).filter(Number.isFinite);
  const activeMeasureMin = activeMeasureValues.length ? Math.min(...activeMeasureValues) : null;
  const activeMeasureMax = activeMeasureValues.length ? Math.max(...activeMeasureValues) : null;
  const phraseMatches = activeMeasureValues.length
    ? allPhraseMatches.filter(match =>
        phraseMatchOverlapsMeasureRange(match, 'A', activeMeasureMin, activeMeasureMax) &&
        phraseMatchOverlapsMeasureRange(match, 'B', activeMeasureMin, activeMeasureMax)
      )
    : allPhraseMatches;
  const phraseGroups = buildPhraseMatchGroups(phraseMatches, windows, analysis.events || [], 0.90);
  // グループの中身はフレーズ窓の配列インデックス。
  // 解析対象が声部単位ならvoiceKey、パート単位ならpartIdで役割結果へ対応付ける。
  const voiceScoped = (analysis.events || []).some(event => event.originalPartId !== undefined);
  const entityForWindow = windowIndex => {
    const window = windows[windowIndex];
    if (!window) return null;
    return voiceScoped ? (window.voiceKey || window.partId) : window.partId;
  };

  const phraseRoleSupport = new Map();
  // 同じフレーズを演奏する別パート間で、役割候補が少し弱い場合も照合する。
  // 強い側の役割を無条件コピーせず、相手側にも最低限の独立した根拠がある場合だけ補強する。
  const addPhraseRoleSupport = (partId, role, score) => {
    if (!phraseRoleSupport.has(partId)) phraseRoleSupport.set(partId, new Map());
    const map = phraseRoleSupport.get(partId);
    map.set(role, Math.max(map.get(role) || 0, score));
  };
  phraseMatches.forEach(match => {
    // STEP29: 同一素材の演奏パートを取りこぼさないよう、強い一致(0.86以上)も
    // 役割整合性の候補にする。ただし類似度だけで色をコピーせず、各パート側の
    // 独立した役割根拠と競合役割を必ず確認する。
    if (match.sameVoice || match.samePart || Number(match.similarity) < 0.86) return;
    const indexA = match.windowIndexA;
    const indexB = match.windowIndexB;
    const partA = entityForWindow(indexA);
    const partB = entityForWindow(indexB);
    if (!partA || !partB || partA === partB) return;
    const itemA = roleByPart.get(partA);
    const itemB = roleByPart.get(partB);
    if (!itemA || !itemB) return;
    roleKeys.forEach(role => {
      const scoreA = Number(itemA.candidateScores?.[role] ?? itemA.roleSupportScores?.[role] ?? 0);
      const scoreB = Number(itemB.candidateScores?.[role] ?? itemB.roleSupportScores?.[role] ?? 0);
      const threshold = roleThresholds[role] || 0.56;
      const otherA = Math.max(0, ...roleKeys.filter(key => key !== role).map(key => Number(itemA.candidateScores?.[key] ?? itemA.roleSupportScores?.[key] ?? 0)));
      const otherB = Math.max(0, ...roleKeys.filter(key => key !== role).map(key => Number(itemB.candidateScores?.[key] ?? itemB.roleSupportScores?.[key] ?? 0)));
      const aAnchors = scoreA >= threshold && scoreA >= otherA - 0.05;
      const bAnchors = scoreB >= threshold && scoreB >= otherB - 0.05;
      const phraseEvidenceFloor = Number(match.similarity) >= 0.90 ? 0.32 : 0.38;
      if (aAnchors && scoreB >= Math.max(phraseEvidenceFloor, threshold - 0.24) && otherB < scoreB + 0.12) {
        addPhraseRoleSupport(partB, role, Math.min(0.88, Math.max(scoreB, scoreA * 0.92)));
      }
      if (bAnchors && scoreA >= Math.max(phraseEvidenceFloor, threshold - 0.24) && otherA < scoreA + 0.12) {
        addPhraseRoleSupport(partA, role, Math.min(0.88, Math.max(scoreA, scoreB * 0.92)));
      }
    });
  });
  phraseGroups.forEach(group => {
    const members = [...new Set(group.map(entityForWindow).filter(Boolean))]
      .map(id => roleByPart.get(id)).filter(Boolean);
    if (members.length < 2) return;
    roleKeys.forEach(role => {
      const scores = members.map(item => Number(item.candidateScores?.[role] || 0));
      const strong = Math.max(...scores);
      if (strong < 0.68) return;
      // グループ全員に最低限の独立根拠があり、別役割が明確なメンバーがいない場合のみ整合。
      const valid = members.every((item,index) => {
        const score = scores[index];
        const other = Math.max(0, ...roleKeys.filter(key => key !== role)
          .map(key => Number(item.candidateScores?.[key] || 0)));
        return score >= Math.max(0.44, roleThresholds[role] - 0.12) && other < score + 0.12;
      });
      if (!valid) return;
      members.forEach((item,index) => {
        if (!phraseRoleSupport.has(item.partId)) phraseRoleSupport.set(item.partId, new Map());
        const map = phraseRoleSupport.get(item.partId);
        const support = Math.min(0.08, Math.max(0, strong - 0.68) * 0.25 + 0.02);
        map.set(role, Math.max(map.get(role) || 0, Math.min(0.94, scores[index] + support)));
      });
    });
  });
  phraseRoleSupport.forEach((roleMap, partId) => {
    const item = roleByPart.get(partId);
    if (!item) return;
    roleMap.forEach((score, role) => {
      item.candidateScores[role] = Math.max(Number(item.candidateScores[role] || 0), score);
    });
    const ranked = Object.entries(item.candidateScores).sort((a,b) => b[1] - a[1]);
    item.selectedRole = ranked[0]?.[0] || null;
    item.roles = item.selectedRole ? [item.selectedRole] : [];
    item.phraseRoleConsistency = [...roleMap.keys()];
  });

  // 対旋律は曲全体で独立した候補を順位付けし、上位2パートを別レイヤーにする。
  // 同一フレーズの重複パートや主旋律候補は、対旋律として二重計上しない。
  const counterRanked = classified
    .filter(item => Number(item.candidateScores?.['対旋律候補']) >= 0.56 &&
      !item.roles.includes('主旋律候補'))
    .sort((a,b) => b.candidateScores['対旋律候補'] - a.candidateScores['対旋律候補']);
  counterRanked.slice(0,2).forEach((item,index) => {
    if (index===1 && item.candidateScores['対旋律候補'] < 0.62) return;
    const role=index===0?'対旋律候補':'対旋律候補2';
    item.candidateScores[role]=item.candidateScores['対旋律候補'];
    const ranked=Object.entries(item.candidateScores).sort((a,b)=>b[1]-a[1]);
    item.selectedRole=ranked[0]?.[0] || null;
    item.roles=item.selectedRole?[item.selectedRole]:[];
  });
  return classified;
}

// 同一声部のメロディーフレーズが前後の小節で継続している場合、
// 中間小節だけ別役割になる不連続を補正する。中間小節に実音がある場合のみ適用。
function reinforceBridgedMelodyMeasures(measureResults, scoreTimeline) {
  const byVoice = new Map();
  (measureResults || []).forEach(result => {
    (result.voiceRoleResults || []).forEach(voice => {
      if (!byVoice.has(voice.voiceKey)) byVoice.set(voice.voiceKey, new Map());
      byVoice.get(voice.voiceKey).set(result.measureIndex, voice);
    });
  });
  const eventsByVoiceMeasure = new Map();
  const onsetGroupsByMeasure = new Map();
  (scoreTimeline || []).forEach(event => {
    if (event.isRest || event.isGrace || !Number.isFinite(event.concertMidiNumber)) return;
    const voiceKey = getScoreVoiceKey(event);
    const key = `${voiceKey}|${event.measureIndex}`;
    eventsByVoiceMeasure.set(key, (eventsByVoiceMeasure.get(key) || 0) + 1);
    const onset = Number.isFinite(event.onsetBeats) ? event.onsetBeats :
      (Number.isFinite(event.onset) ? event.onset : null);
    if (onset === null) return;
    const groupKey = `${event.measureIndex}|${Number(onset).toFixed(3)}`;
    if (!onsetGroupsByMeasure.has(groupKey)) onsetGroupsByMeasure.set(groupKey, []);
    onsetGroupsByMeasure.get(groupKey).push({voiceKey, pitch:event.concertMidiNumber});
  });
  // 小節内の各発音タイミングで最低音を担った割合を計算する。
  // 四分音符のように短い音価でも、和声の土台を継続して担えばベース根拠にする。
  const lowestShareByVoiceMeasure = new Map();
  const activeOnsetsByVoiceMeasure = new Map();
  const onsetCountByMeasure = new Map();
  onsetGroupsByMeasure.forEach((group, groupKey) => {
    const measureIndex = Number(groupKey.split('|')[0]);
    onsetCountByMeasure.set(measureIndex, (onsetCountByMeasure.get(measureIndex) || 0) + 1);
    const lowest = Math.min(...group.map(item => item.pitch));
    const activeVoices = new Set(group.map(item => item.voiceKey));
    activeVoices.forEach(voiceKey => {
      const key = `${voiceKey}|${measureIndex}`;
      activeOnsetsByVoiceMeasure.set(key, (activeOnsetsByVoiceMeasure.get(key) || 0) + 1);
    });
    const lowestVoices = new Set(group.filter(item => item.pitch === lowest).map(item => item.voiceKey));
    lowestVoices.forEach(voiceKey => {
      const key = `${voiceKey}|${measureIndex}`;
      lowestShareByVoiceMeasure.set(key, (lowestShareByVoiceMeasure.get(key) || 0) + 1);
    });
  });
  byVoice.forEach((measureMap, voiceKey) => {
    const indexes = [...measureMap.keys()].sort((a,b) => a-b);
    for (let i = 0; i < indexes.length; i++) {
      const leftIndex = indexes[i];
      const left = measureMap.get(leftIndex);
      if (!(left.roles || []).includes('主旋律候補')) continue;
      for (let j = i + 1; j < indexes.length; j++) {
        const rightIndex = indexes[j];
        const gap = rightIndex - leftIndex;
        if (gap > 4) break;
        if (gap < 2) continue;
        const right = measureMap.get(rightIndex);
        if (!(right.roles || []).includes('主旋律候補')) continue;
        // 前後の旋律アンカーに挟まれた最大3小節の空白を順に確認する。
        // 休符だけの小節や、明確な別役割がある小節は補完しない。
        for (let middleIndex = leftIndex + 1; middleIndex < rightIndex; middleIndex++) {
          const middle = measureMap.get(middleIndex);
          if (!middle) continue;
          const noteCount = eventsByVoiceMeasure.get(`${voiceKey}|${middleIndex}`) || 0;
          if (noteCount === 0) continue;
          const scores = middle.candidateScores || {};
          const competingRoles = (middle.roles || []).filter(role => role !== '主旋律候補');
          const strongestCompeting = Math.max(0,
            ...Object.entries(scores).filter(([role]) => role !== '主旋律候補').map(([, score]) => Number(score) || 0),
            ...competingRoles.map(role => Number(scores[role]) || 0.60));
          const localMelodyScore = Number(scores['主旋律候補'] || 0);
          // 明確に強いベース・伴奏等の根拠がある場合は上書きしない。
          if (strongestCompeting >= 0.76 && strongestCompeting > localMelodyScore + 0.12) continue;
          middle.roles = ['主旋律候補'];
          middle.status = 'melody-phrase-bridged';
          middle.reason = '前後の小節が同一声部の主旋律で、中間小節にも実音があり、最大4小節のフレーズ継続として補強';
          middle.candidateScores = {...scores, '主旋律候補': Math.max(localMelodyScore, 0.68)};
          middle.melodyPhraseContinuity = true;
        }
      }
    }
  });

  // STEP31: 各小節で全声部を再評価するベース探索。
  // 同時刻に開始した音だけで最低音を比べると、持続音や異なる発音タイミングを
  // 見落とすため、小節内の各発音時点で「その時点に鳴っている音」を比較する。
  const eventsByMeasureForBass = new Map();
  (scoreTimeline || []).forEach(event => {
    if (event.isRest || event.isGrace || !Number.isFinite(event.concertMidiNumber)) return;
    if (!eventsByMeasureForBass.has(event.measureIndex)) eventsByMeasureForBass.set(event.measureIndex, []);
    eventsByMeasureForBass.get(event.measureIndex).push(event);
  });

  (measureResults || []).forEach(result => {
    const voices = result.voiceRoleResults || [];
    if (!voices.length) return;
    const measureIndex = result.measureIndex;
    const events = eventsByMeasureForBass.get(measureIndex) || [];
    if (!events.length) return;

    const onsets = [...new Set(events.map(event => Number(event.onsetBeats) || 0))].sort((a,b) => a-b);
    if (!onsets.length) return;
    const metrics = new Map();
    const ensure = key => {
      if (!metrics.has(key)) metrics.set(key, {active:0, lowest:0, bottomBand:0, pitches:[], representativePitches:[], activeOnsets:[]});
      return metrics.get(key);
    };
    onsets.forEach(onset => {
      const active = events.filter(event => {
        const start = Number(event.onsetBeats) || 0;
        const duration = Math.max(0.001, Number(event.durationBeats) || 0.001);
        return start <= onset + 0.0001 && start + duration > onset + 0.0001;
      });
      if (!active.length) return;
      const pitches = active.map(event => event.concertMidiNumber).sort((a,b)=>a-b);
      const lowest = pitches[0];
      const bottomCut = pitches[Math.min(pitches.length - 1, Math.floor((pitches.length - 1) * 0.25))];
      const activeByVoice = new Map();
      active.forEach(event => {
        const key = getScoreVoiceKey(event);
        if (!activeByVoice.has(key)) activeByVoice.set(key, []);
        activeByVoice.get(key).push(event.concertMidiNumber);
      });
      activeByVoice.forEach((voicePitches, key) => {
        const metric = ensure(key);
        metric.active++;
        metric.activeOnsets.push(onset);
        metric.pitches.push(...voicePitches);
        metric.representativePitches.push(Math.min(...voicePitches));
        if (Math.min(...voicePitches) <= lowest + 1) metric.lowest++;
        if (Math.min(...voicePitches) <= bottomCut + 2) metric.bottomBand++;
      });
    });

    const totalOnsets = onsets.length;
    const ensemblePitches = events.map(event => event.concertMidiNumber).sort((a,b)=>a-b);
    const ensembleMedian = ensemblePitches.length ? ensemblePitches[Math.floor(ensemblePitches.length / 2)] : 60;
    const ranked = voices.filter(voice => Number(voice.noteCount) > 0).map(voice => {
      const metric = metrics.get(voice.voiceKey) || {active:0,lowest:0,bottomBand:0,pitches:[],representativePitches:[],activeOnsets:[]};
      const activeShare = metric.active / totalOnsets;
      const lowestShare = metric.lowest / totalOnsets;
      const bottomShare = metric.bottomBand / totalOnsets;
      const median = metric.pitches.length
        ? [...metric.pitches].sort((a,b)=>a-b)[Math.floor(metric.pitches.length / 2)] : ensembleMedian;
      const lowRegister = Math.max(0, Math.min(1, (ensembleMedian - median + 2) / 18));
      const chronologicalPitches = metric.representativePitches;
      const intervals = chronologicalPitches.slice(1).map((pitch,index)=>Math.abs(pitch-chronologicalPitches[index]));
      const movement = intervals.length
        ? Math.min(1, intervals.filter(interval => interval > 0 && interval <= 12).length / intervals.length) : 0;
      const support = voice.roleSupportScores || {};
      const evidence = voice.roleEvidence || {};
      const baseBass = Number(support['ベース候補'] ?? voice.candidateScores?.['ベース候補'] ?? 0);
      const melodyScore = Math.max(
        Number(voice.candidateScores?.['主旋律候補']) || 0,
        Number(support['主旋律候補']) || 0,
        Number(voice.melodyScore) ? Number(voice.melodyScore) / 100 : 0
      );
      const strongestOther = Math.max(0, ...Object.entries(support)
        .filter(([role]) => role !== 'ベース候補' && role !== '主旋律候補')
        .map(([,score]) => Number(score) || 0));
      const isMelody = (voice.roles || []).includes('主旋律候補') ||
        voice.status === 'melody-phrase-bridged' || voice.melodyPhraseContinuity === true;
      // 音域だけで決めず、持続音を含む最低音・低音域滞在・発音継続・既存根拠を統合。
      // 四分音符など短い音価でも、発音の連続性があれば候補に残す。
      const structural =
        0.30 * lowestShare +
        0.17 * bottomShare +
        0.14 * activeShare +
        0.14 * lowRegister +
        0.13 * movement +
        0.12 * baseBass;
      const bass = Math.max(baseBass, Math.min(0.92, structural));
      return {voice, bass, baseBass, lowestShare, bottomShare, activeShare,
        lowRegister, movement, melodyScore, strongestOther, isMelody,
        lowPosition: Number(evidence.lowPositionRatio) || 0};
    })
      // 明確な旋律声部は保護。ただし低音楽器という理由だけでは除外しない。
      .filter(item => !(item.isMelody && item.melodyScore >= 0.50))
      .filter(item => item.activeShare >= 0.20 && item.bass >= 0.40)
      .filter(item => item.lowestShare >= 0.08 || item.bottomShare >= 0.28 ||
        (item.lowRegister >= 0.45 && item.activeShare >= 0.45))
      .filter(item => item.strongestOther < item.bass + 0.12)
      .sort((a,b) => b.bass - a.bass);

    const currentBass = voices.filter(voice => (voice.roles || []).includes('ベース候補'));
    const best = ranked[0];
    if (!best) return;

    // 既存ベースがない場合は最有力声部を採用。複数パートが同じ低音ラインを
    // オクターブ等で重ねている場合は、十分近い根拠の声部もベースとして保持する。
    if (!currentBass.length) {
      const selected = ranked.filter(item => item.bass >= Math.max(0.48, best.bass - 0.10)).slice(0, 4);
      selected.forEach(item => {
        item.voice.roles = ['ベース候補'];
        item.voice.candidateScores = {...(item.voice.candidateScores || {}), 'ベース候補': Math.max(0.58, item.bass)};
        item.voice.status = 'bass-role-recovered';
        item.voice.reason = '持続音を含む同時発音・最低音担当・低音域での継続・音の動き・既存の音楽的根拠を全声部で再評価';
        item.voice.bassRecoveryEvidence = {
          lowestShare: item.lowestShare,
          bottomShare: item.bottomShare,
          activeShare: item.activeShare,
          lowRegister: item.lowRegister,
          movement: item.movement,
          score: item.bass
        };
      });
      return;
    }

    // 既存ベースの根拠が弱いときだけ、より強い構造的候補へ変更する。
    const existingQuality = Math.max(...currentBass.map(voice => {
      const item = ranked.find(candidate => candidate.voice.voiceKey === voice.voiceKey);
      return item ? item.bass : Number(voice.roleSupportScores?.['ベース候補']) || 0;
    }));
    if (!currentBass.some(voice => voice.voiceKey === best.voice.voiceKey) &&
        best.bass >= existingQuality + 0.16 && existingQuality < 0.44) {
      currentBass.forEach(voice => {
        voice.roles = (voice.roles || []).filter(role => role !== 'ベース候補');
        voice.status = 'bass-role-reconsidered';
      });
      best.voice.roles = ['ベース候補'];
      best.voice.candidateScores = {...(best.voice.candidateScores || {}), 'ベース候補': Math.max(0.58, best.bass)};
      best.voice.status = 'bass-role-recovered';
      best.voice.reason = '既存ベース候補より、持続音を含む最低音・低音域・発音継続の構造的根拠が強いため再判定';
    }
  });
  return measureResults;
}

// 小節ごとに役割を分析する
// 音の動きが少ない小節では、前後1小節を旋律の動きの参考にする。
// ただし、音域・音符数などの基本特徴と同時演奏の分析は対象小節を中心に判定する。
function analyzeMeasureRoleResults(scoreTimeline, globalPartFeatures, globalRoleResults, globalPhraseAnalysis = null) {
  const measureIndexes = [...new Set(
    scoreTimeline.map(event => event.measureIndex)
  )].sort((a, b) => a - b);

  const globalFeatureMap = new Map(
    (globalPartFeatures || []).map(part => [part.partId, part])
  );
  const globalRoleMap = new Map(
    (globalRoleResults || []).map(part => [part.partId, part.roles || []])
  );
  // 小節別に一度だけ索引化する。従来の全イベント走査を小節ごとに繰り返さず、
  // 同じ対象小節・前後1小節のイベント集合をそのまま維持して処理量を削減する。
  const eventsByMeasure = new Map();
  scoreTimeline.forEach(event => {
    if (!eventsByMeasure.has(event.measureIndex)) eventsByMeasure.set(event.measureIndex, []);
    eventsByMeasure.get(event.measureIndex).push(event);
  });
  // 声部IDを全曲で一貫して使う。フレーズ類似は既存の全体解析を再利用し、
  // match内のvoiceKeyで声部へ対応付けるため、重複した全曲解析を発生させない。
  const toVoiceScopedEvent = event => {
    const voiceKey = getScoreVoiceKey(event);
    return { ...event, originalPartId: event.partId, partId: voiceKey, staff: "1", voice: "1" };
  };

  const measureResults = measureIndexes.map(measureIndex => {
    const measureEvents = eventsByMeasure.get(measureIndex) || [];

    // 前後の小節は、旋律の動きや対旋律の比較材料としてのみ利用する。
    const contextEvents = [
      ...(eventsByMeasure.get(measureIndex - 1) || []),
      ...measureEvents,
      ...(eventsByMeasure.get(measureIndex + 1) || [])
    ];

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

    // メロディ候補の根拠は、判定対象の小節内にある音符から作る。
    // 前後小節を混ぜると、隣の小節で旋律を担当したパートが、
    // 対象小節では長音・伴奏なのにメロディ候補として残ることがある。
    // 小節をまたぐフレーズの関係は、下のphraseAnalysisによる照合で補う。
    const localMotionAnalysis = analyzeMelodicMotion(measureEvents);
    const melodyCandidates = rankMelodyCandidates(
      localFeatures,
      localMotionAnalysis
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
      rhythmRelationships,
      events: measureEvents,
      phraseAnalysis: globalPhraseAnalysis,
      globalRoleResults
    }).map(part => ({
      ...part,
      measureIndex,
      measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
      // 全体分析の役割は参考情報として保持し、小節ごとの判定を固定しない。
      globalReferenceRoles: globalRoleMap.get(part.partId) || []
    }));

    // 声部ごとに独立した特徴量を作り、声部単位で役割候補を判定する。
    // 分析用にだけpartIdを声部キーへ置き換え、元のpartIdは結果に戻す。
    const voiceIdToOriginal = new Map(
      localVoiceFeatures.map(voice => [voice.voiceKey, voice])
    );
    const voiceMeasureEvents = measureEvents.map(toVoiceScopedEvent);
    const voiceContextEvents = contextEvents.map(toVoiceScopedEvent);

    const voiceFeaturesForRoles = analyzePartFeatures(voiceMeasureEvents).map(feature => {
      const original = voiceIdToOriginal.get(feature.partId);
      const parentFeature = globalFeatureMap.get(original?.partId);
      return {
        ...feature,
        instrumentRange: parentFeature?.instrumentRange ?? null,
        inRangeRatio: parentFeature?.inRangeRatio ?? null
      };
    });
    // 声部単位でも、隣接小節の旋律輪郭を対象小節へ直接持ち込まない。
    // 対象小節の音符だけで候補を作り、フレーズ継続はphraseAnalysis側で扱う。
    const voiceMotionAnalysis = analyzeMelodicMotion(voiceMeasureEvents);
    const voiceMelodyCandidates = rankMelodyCandidates(
      voiceFeaturesForRoles,
      voiceMotionAnalysis
    );
    const voiceCounterMelody = analyzeCounterMelodyCandidates(
      voiceContextEvents,
      voiceMelodyCandidates
    );
    const voiceRhythmRelationships = analyzeRhythmRelationships(voiceMeasureEvents);
    const classifiedVoiceRoles = classifyPartRoles({
      partFeatures: voiceFeaturesForRoles,
      melodyCandidates: voiceMelodyCandidates,
      counterMelody: voiceCounterMelody,
      rhythmRelationships: voiceRhythmRelationships,
      events: voiceMeasureEvents,
      phraseAnalysis: globalPhraseAnalysis
    });

    const voiceRoleResults = localVoiceFeatures.map(voice => {
      const classified = classifiedVoiceRoles.find(item => item.partId === voice.voiceKey);
      const melody = voiceMelodyCandidates.find(item => item.partId === voice.voiceKey);
      const hasEnoughNotes = voice.noteCount >= 2;
      const detectedRoles = classified?.roles || [];
      return {
        voiceKey: voice.voiceKey,
        partId: voice.partId,
        partName: voice.partName,
        staff: voice.staff,
        voice: voice.voice,
        measureIndex,
        measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
        roles: hasEnoughNotes ? detectedRoles : [],
        melodyScore: melody?.melodyScore ?? null,
        // 無色の原因を「音符不足」と「候補スコア不足」に分けて追跡する。
        noteCount: voice.noteCount,
        restCount: voice.restCount,
        candidateScores: classified?.candidateScores || {},
        roleSupportScores: classified?.roleSupportScores || {},
        roleEvidence: classified?.roleEvidence || {},
        status: hasEnoughNotes ? "voice-role-analyzed" : "insufficient-measure-data",
        reason: hasEnoughNotes
          ? "声部ごとの音域・音の動き・対旋律・リズム関係から独立判定"
          : "この小節の音符情報が少ないため、役割を確定せず保留"
      };
    });

    return {
      measureIndex,
      measureNumber: measureEvents[0]?.measureNumber ?? String(measureIndex + 1),
      roles,
      melodyCandidates,
      simultaneousAnalysis,
      voiceFeatures: localVoiceFeatures,
      voiceRoleResults,
      voiceMelodyCandidates,
      voiceCounterMelody,
      voiceRhythmRelationships
    };
  });
  return reinforceBridgedMelodyMeasures(measureResults, scoreTimeline);
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
    const voiceResults = measureResult.voiceRoleResults || [];
    const voicesByPart = new Map();
    voiceResults.forEach(voice => {
      if (!voicesByPart.has(voice.partId)) voicesByPart.set(voice.partId, []);
      voicesByPart.get(voice.partId).push(voice);
    });

    // 声部単位の判定を優先してマーカーへ反映する。
    // 複数声部のパートで判定保留になった声部は、パート全体の役割を
    // 安易に流用せず無色のままにする。
    voiceResults.forEach(voice => {
      const roles = voice.roles || [];
      if (!roles.length) return;
      const layers = roles.map(role => roleLayerMap[role]).filter(Boolean);
      if (!layers.length) return;

      const voiceEvents = events.filter(event =>
        event.partId === voice.partId &&
        getScoreVoiceKey(event) === voice.voiceKey &&
        event.measureIndex === measureResult.measureIndex &&
        !event.isRest &&
        !event.isGrace &&
        Number.isFinite(event.concertMidiNumber) &&
        event.imagePosition &&
        Number.isFinite(event.imagePosition.page) &&
        Number.isFinite(event.imagePosition.x) &&
        Number.isFinite(event.imagePosition.y)
      );

      voiceEvents.forEach(event => {
        layers.forEach(layerName => {
          const layer = analysisLayers[layerName];
          if (!layer || !scoreAnnotations[layerName]) return;
          annotations.push({
            layerName,
            color: layer.color,
            partId: event.partId,
            voiceKey: voice.voiceKey,
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

    // 声部情報が取得できない単一声部パートに限り、従来のパート判定へ戻す。
    measureResult.roles.forEach(part => {
      const partVoices = voicesByPart.get(part.partId) || [];
      if (partVoices.length > 1 || partVoices.length === 1) return;
      if (!part.roles || !part.roles.length) return;
      const layers = part.roles.map(role => roleLayerMap[role]).filter(Boolean);
      if (!layers.length) return;
      const partEvents = events.filter(event =>
        event.partId === part.partId &&
        event.measureIndex === measureResult.measureIndex &&
        !event.isRest && event.imagePosition &&
        Number.isFinite(event.imagePosition.page) &&
        Number.isFinite(event.imagePosition.x) &&
        Number.isFinite(event.imagePosition.y)
      );
      partEvents.forEach(event => layers.forEach(layerName => {
        const layer = analysisLayers[layerName];
        if (!layer || !scoreAnnotations[layerName]) return;
        annotations.push({
          layerName, color: layer.color, partId: event.partId,
          measureIndex: event.measureIndex, page: event.imagePosition.page,
          x: event.imagePosition.x, y: event.imagePosition.y,
          noteName: event.noteName, measureNumber: event.measureNumber
        });
      }));
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
    "melody", "harmony", "countermelody", "countermelody2",
    "bass", "accompaniment", "rhythm"
  ];

  // 前回「実際に描画した」注釈の署名を保持しておく。
  // createRoleAnnotationData() は scoreAnnotations を先に作り直すため、
  // scoreAnnotations から前回値を取得すると新旧比較にならない。
  const previousSignatures = window.scoreRenderedAnnotationSignatures instanceof Map
    ? window.scoreRenderedAnnotationSignatures
    : new Map();

  const nextSignatures = new Map();
  annotations.forEach(item => {
    const page = Number(item.page);
    if (!Number.isFinite(page)) return;
    if (!nextSignatures.has(page)) nextSignatures.set(page, []);
    nextSignatures.get(page).push(
      `${item.layerName}|${item.partId}|${item.voiceKey || ""}|${item.measureIndex}|${item.x}|${item.y}`
    );
  });
  nextSignatures.forEach((items, page) => {
    nextSignatures.set(page, items.sort().join("\n"));
  });

  // 表示用レイヤーを最新の判定結果で置き換える。
  roleLayers.forEach(layerName => {
    if (scoreAnnotations[layerName]) scoreAnnotations[layerName] = [];
  });

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

  const allPages = new Set([
    ...previousSignatures.keys(),
    ...nextSignatures.keys()
  ]);
  const changedPages = [...allPages].filter(page =>
    previousSignatures.get(page) !== nextSignatures.get(page)
  ).sort((a, b) => a - b);

  // 初回は、マーカーが0件のページも含めて全ページを描画対象にする。
  if (!window.scoreAnnotationRenderInitialized) {
    document.querySelectorAll(".pdf-page").forEach((_, index) => {
      const pageNumber = index + 1;
      if (!changedPages.includes(pageNumber)) changedPages.push(pageNumber);
    });
    changedPages.sort((a, b) => a - b);
    window.scoreAnnotationRenderInitialized = true;
  }

  // 今回の署名は、描画対象ページの再描画が完了した後に確定する。
  // 呼び出し元がこのMapを使って再描画する。
  window.scoreRenderedAnnotationSignatures = nextSignatures;
  return changedPages;
}

function detectMelodyHandoffs(events, melodyCandidates, measureResults = [], phraseAnalysis = null) {
  // 小節内だけでなく、隣接する小節の境界でも旋律候補を比較する。
  // onsetBeats は小節ごとにリセットされるため、小節長から通しの拍位置を作る。
  const globalCandidateIds = new Set(
    (melodyCandidates || [])
      .filter(item => item.candidate)
      .map(item => item.partId)
  );
  const localCandidates = new Map();
  (measureResults || []).forEach(measure => {
    const ids = new Set();
    (measure.voiceRoleResults || []).forEach(voice => {
      if ((voice.roles || []).includes("主旋律候補")) ids.add(voice.partId);
    });
    (measure.roles || []).forEach(part => {
      if ((part.roles || []).includes("主旋律候補")) ids.add(part.partId);
    });
    if (ids.size) localCandidates.set(measure.measureIndex, ids);
  });

  const measureTimeline = buildMeasureBeatOffsets(events);
  const measureOffsets = measureTimeline.offsets;

  const notesByMeasure = new Map();
  (events || []).forEach(event => {
    if (event.isRest || event.isGrace ||
        !Number.isFinite(event.concertMidiNumber) ||
        !Number.isFinite(event.onsetBeats) ||
        !Number.isFinite(event.durationBeats) || event.durationBeats <= 0) return;
    const candidates = localCandidates.get(event.measureIndex);
    const isCandidate = candidates?.has(event.partId) ||
      (!candidates && globalCandidateIds.has(event.partId));
    if (!isCandidate) return;
    if (!notesByMeasure.has(event.measureIndex)) notesByMeasure.set(event.measureIndex, new Map());
    const byPart = notesByMeasure.get(event.measureIndex);
    if (!byPart.has(event.partId)) byPart.set(event.partId, []);
    byPart.get(event.partId).push(event);
  });

  const summaries = new Map();
  notesByMeasure.forEach((byPart, measureIndex) => {
    const offset = measureOffsets.get(measureIndex) || 0;
    const parts = new Map();
    byPart.forEach((partEvents, partId) => {
      const sorted = partEvents.slice().sort((a, b) => a.onsetBeats - b.onsetBeats);
      const firstNote = sorted[0];
      const lastEnd = Math.max(...sorted.map(event => event.onsetBeats + event.durationBeats));
      const lastNotes = sorted.filter(event => Math.abs(event.onsetBeats + event.durationBeats - lastEnd) < 0.0001);
      parts.set(partId, {
        partId, firstNote, lastNotes,
        firstGlobal: offset + firstNote.onsetBeats,
        lastGlobal: offset + lastEnd,
        lastEnd, measureIndex
      });
    });
    summaries.set(measureIndex, parts);
  });

  const handoffs = [];
  const seen = new Set();
  const maxGapBeats = 1;
  const maxOverlapBeats = 0.1;
  const maxPitchDifference = 7;
  const compare = (outgoing, incoming, displayMeasureIndex) => {
    if (!outgoing || !incoming || outgoing.partId === incoming.partId) return;
    const timeDifference = incoming.firstGlobal - outgoing.lastGlobal;
    if (timeDifference < -maxOverlapBeats || timeDifference > maxGapBeats) return;
    const closest = outgoing.lastNotes.map(note => ({
      note,
      difference: Math.abs(incoming.firstNote.concertMidiNumber - note.concertMidiNumber)
    })).sort((a, b) => a.difference - b.difference)[0];
    if (!closest || closest.difference > maxPitchDifference) return;
    const key = `${outgoing.partId}|${incoming.partId}|${outgoing.lastGlobal}|${incoming.firstGlobal}`;
    if (seen.has(key)) return;
    seen.add(key);
    handoffs.push({
      measureIndex: displayMeasureIndex,
      measureNumber: incoming.firstNote.measureNumber || outgoing.lastNotes[0].measureNumber,
      fromPartId: outgoing.partId,
      toPartId: incoming.partId,
      fromPitch: closest.note.concertMidiNumber,
      toPitch: incoming.firstNote.concertMidiNumber,
      timeDifference,
      pitchDifference: closest.difference,
      confidence: timeDifference >= 0 ? "候補" : "重なりを含む候補",
      crossesMeasure: outgoing.measureIndex !== incoming.measureIndex
    });
  };

  // 同一小節内の受け渡し
  summaries.forEach((parts, measureIndex) => {
    const list = [...parts.values()];
    list.forEach(outgoing => list.forEach(incoming => compare(outgoing, incoming, measureIndex)));
  });

  // 隣接する小節の終端→先頭を比較（小節をまたぐ受け渡し）
  const measureIndexes = [...summaries.keys()].sort((a, b) => a - b);
  for (let i = 0; i < measureIndexes.length - 1; i++) {
    const currentIndex = measureIndexes[i];
    const nextIndex = measureIndexes[i + 1];
    if (nextIndex !== currentIndex + 1) continue;
    const outgoingParts = [...summaries.get(currentIndex).values()];
    const incomingParts = [...summaries.get(nextIndex).values()];
    outgoingParts.forEach(outgoing => incomingParts.forEach(incoming =>
      compare(outgoing, incoming, nextIndex)
    ));
  }

  // フレーズ全体が別パートへ引き継がれるケースを追加検出する。
  // 近接して同じ/類似フレーズを演奏するだけの同時ユニゾンは受け渡しにしない。
  const handoffPhraseAnalysis = phraseAnalysis || analyzePhraseRelationships(events || []);
  (handoffPhraseAnalysis.matches || []).forEach(match => {
    if (match.samePart || match.similarity < 0.84) return;
    const aStart = match.startGlobalBeatA, aEnd = match.endGlobalBeatA;
    const bStart = match.startGlobalBeatB, bEnd = match.endGlobalBeatB;
    if (![aStart,aEnd,bStart,bEnd].every(Number.isFinite)) return;
    let outgoingId, incomingId, outgoingEnd, incomingStart, displayMeasure;
    if (bStart >= aEnd - 0.1 && bStart - aEnd <= 1.5) {
      outgoingId = match.partAId; incomingId = match.partBId;
      outgoingEnd = aEnd; incomingStart = bStart;
      displayMeasure = match.measureB;
    } else if (aStart >= bEnd - 0.1 && aStart - bEnd <= 1.5) {
      outgoingId = match.partBId; incomingId = match.partAId;
      outgoingEnd = bEnd; incomingStart = aStart;
      displayMeasure = match.measureA;
    } else return;
    const key = `phrase:${outgoingId}|${incomingId}|${outgoingEnd.toFixed(3)}|${incomingStart.toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    handoffs.push({
      measureIndex: displayMeasure,
      measureNumber: displayMeasure + 1,
      fromPartId: outgoingId,
      toPartId: incomingId,
      fromPitch: null,
      toPitch: null,
      timeDifference: incomingStart - outgoingEnd,
      pitchDifference: null,
      confidence: match.similarity >= 0.92 ? "フレーズ一致による有力候補" : "フレーズ類似による候補",
      crossesMeasure: match.measureA !== match.measureB || match.measureAEnd !== match.measureBEnd,
      phraseSimilarity: match.similarity
    });
  });

  return handoffs.sort((a, b) =>
    a.measureIndex - b.measureIndex ||
    a.timeDifference - b.timeDifference ||
    (a.pitchDifference ?? 99) - (b.pitchDifference ?? 99)
  );
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
        `${handoff.measureNumber}小節目${handoff.crossesMeasure ? "（小節またぎ）" : ""}・${getIntervalName(handoff.pitchDifference)}・受け渡し候補`;

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
  window.scoreAnalysisStatus = "none";
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
    await import("./engine/score-compass-engine.js");

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
        runMusicXMLAnalysis({ provisional: true });
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

  runMusicXMLAnalysis({ provisional: false });

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

