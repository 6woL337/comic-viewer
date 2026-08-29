import {
  db
} from "./firebase-config.js";


import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const R2_CONFIG = {

  workerUrl: "https://comic-upload.w82733037.workers.dev/"
};


/* =========================================================
   상태
========================================================= */

let works = [];

let currentType =
  "webtoon";

let currentUploader =
  "all";

let selectedWork =
  null;

let currentChapters =
  [];

let uploadMode =
  "new";


/* 웹툰 */

let currentEpisodeIndex =
  0;


/* 만화 */

let currentVolumeIndex =
  0;

let currentPage =
  0;

let pageMode =
  1;

let readingDirection =
  localStorage.getItem(
    "comicReadingDirection"
  ) || "rtl";


/* =========================================================
   DOM
========================================================= */

const libraryPage =
  document.getElementById(
    "libraryPage"
  );

const detailPage =
  document.getElementById(
    "detailPage"
  );

const webtoonViewer =
  document.getElementById(
    "webtoonViewer"
  );

const comicViewer =
  document.getElementById(
    "comicViewer"
  );


const worksGrid =
  document.getElementById(
    "worksGrid"
  );

const libraryStatus =
  document.getElementById(
    "libraryStatus"
  );

const uploaderFilters =
  document.getElementById(
    "uploaderFilters"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const sortSelect =
  document.getElementById(
    "sortSelect"
  );


const uploadModal =
  document.getElementById(
    "uploadModal"
  );

const uploadForm =
  document.getElementById(
    "uploadForm"
  );

const uploadSubmitBtn =
  document.getElementById(
    "uploadSubmitBtn"
  );


/* =========================================================
   Firestore 작품 실시간 읽기
========================================================= */

function startWorksListener() {

  const worksQuery =
    query(
      collection(
        db,
        "works"
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );


  onSnapshot(
    worksQuery,

    snapshot => {

      works =
        snapshot.docs.map(
          documentSnapshot => {

            return {
              id:
                documentSnapshot.id,

              ...documentSnapshot.data()
            };

          }
        );


      libraryStatus.textContent =
        "";

      renderUploaderFilters();

      renderWorks();


      /*
        상세 페이지를 보고 있는 동안
        작품 정보가 변경되었으면 갱신
      */

      if (
        selectedWork
      ) {

        const updated =
          works.find(
            work =>
              work.id ===
              selectedWork.id
          );

        if (
          updated
        ) {

          selectedWork =
            updated;

          renderDetailInfo();

        }

      }

    },

    error => {

      console.error(
        "Firestore 오류:",
        error
      );

      libraryStatus.textContent =
        "작품 목록을 불러오지 못했습니다. Firestore 설정과 보안 규칙을 확인해주세요.";

    }
  );

}


startWorksListener();


/* =========================================================
   화면
========================================================= */

function hideAllPages() {

  libraryPage.classList.add(
    "hidden"
  );

  detailPage.classList.add(
    "hidden"
  );

  webtoonViewer.classList.add(
    "hidden"
  );

  comicViewer.classList.add(
    "hidden"
  );

}


function showLibrary() {

  hideAllPages();

  libraryPage.classList.remove(
    "hidden"
  );

  selectedWork =
    null;

  currentChapters =
    [];

  window.scrollTo(
    0,
    0
  );

}


function showDetail() {

  hideAllPages();

  detailPage.classList.remove(
    "hidden"
  );

  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   홈
========================================================= */

document.getElementById(
  "homeLogo"
).addEventListener(
  "click",
  showLibrary
);


/* =========================================================
   웹툰 / 만화 탭
========================================================= */

document
  .querySelectorAll(
    ".type-tab"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".type-tab"
            )
            .forEach(
              btn =>
                btn.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          currentType =
            button.dataset.type;

          currentUploader =
            "all";


          renderUploaderFilters();

          renderWorks();

        }
      );

    }
  );


/* =========================================================
   업로더 필터
========================================================= */

function renderUploaderFilters() {

  const uploaders =
    [
      ...new Set(

        works
          .filter(
            work =>
              work.type ===
              currentType
          )
          .map(
            work =>
              work.uploader
          )
          .filter(Boolean)

      )
    ];


  uploaders.sort(
    (a, b) =>
      a.localeCompare(
        b,
        "ko"
      )
  );


  uploaderFilters.innerHTML =
    "";


  createUploaderButton(
    "전체",
    "all"
  );


  uploaders.forEach(
    uploader => {

      createUploaderButton(
        uploader,
        uploader
      );

    }
  );

}


function createUploaderButton(
  label,
  value
) {

  const button =
    document.createElement(
      "button"
    );


  button.className =
    "uploader-filter";


  button.textContent =
    label;


  if (
    currentUploader ===
    value
  ) {

    button.classList.add(
      "active"
    );

  }


  button.addEventListener(
    "click",
    () => {

      currentUploader =
        value;

      renderUploaderFilters();

      renderWorks();

    }
  );


  uploaderFilters.appendChild(
    button
  );

}


/* =========================================================
   작품 목록
========================================================= */

function renderWorks() {

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();


  let filtered =
    works.filter(
      work => {

        const typeMatch =
          work.type ===
          currentType;


        const uploaderMatch =
          currentUploader ===
            "all" ||
          work.uploader ===
            currentUploader;


        const text =
          `${work.title || ""} ${work.uploader || ""}`
            .toLowerCase();


        const searchMatch =
          text.includes(
            keyword
          );


        return (
          typeMatch &&
          uploaderMatch &&
          searchMatch
        );

      }
    );


  if (
    sortSelect.value ===
    "title"
  ) {

    filtered.sort(
      (a, b) =>
        (a.title || "")
          .localeCompare(
            b.title || "",
            "ko"
          )
    );

  } else {

    filtered.sort(
      (a, b) => {

        const at =
          a.createdAt
            ?.toMillis?.() || 0;

        const bt =
          b.createdAt
            ?.toMillis?.() || 0;

        return bt - at;

      }
    );

  }


  worksGrid.innerHTML =
    "";


  if (
    filtered.length === 0
  ) {

    libraryStatus.textContent =
      "등록된 작품이 없습니다.";

    return;

  }


  libraryStatus.textContent =
    "";


  filtered.forEach(
    work => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "work-card";


      const thumbnailBox =
        document.createElement(
          "div"
        );

      thumbnailBox.className =
        "thumbnail-box";


      const image =
        document.createElement(
          "img"
        );

      image.className =
        "work-thumbnail";

      image.alt =
        work.title || "작품 표지";

      image.loading =
        "lazy";


      if (
        work.thumbnailUrl
      ) {

        image.src =
          work.thumbnailUrl;

      } else {

        image.src =
          makePlaceholder();

      }


      image.onerror =
        () => {

          image.src =
            makePlaceholder();

        };


      const badge =
        document.createElement(
          "span"
        );

      badge.className =
        "work-type-badge";

      badge.textContent =
        work.type === "webtoon"
          ? "웹툰"
          : "만화";


      thumbnailBox.append(
        image,
        badge
      );


      const title =
        document.createElement(
          "div"
        );

      title.className =
        "work-title";

      title.textContent =
        work.title ||
        "제목 없음";


      const uploader =
        document.createElement(
          "div"
        );

      uploader.className =
        "work-uploader";

      uploader.textContent =
        work.uploader ||
        "업로더 없음";


      card.append(
        thumbnailBox,
        title,
        uploader
      );


      card.addEventListener(
        "click",
        () =>
          openWork(
            work
          )
      );


      worksGrid.appendChild(
        card
      );

    }
  );

}


searchInput.addEventListener(
  "input",
  renderWorks
);


sortSelect.addEventListener(
  "change",
  renderWorks
);


/* =========================================================
   작품 상세
========================================================= */

async function openWork(
  work
) {

  selectedWork =
    work;


  renderDetailInfo();

  showDetail();


  await loadChapters();

}


function renderDetailInfo() {

  if (
    !selectedWork
  ) {
    return;
  }


  const thumbnail =
    document.getElementById(
      "detailThumbnail"
    );


  thumbnail.src =
    selectedWork.thumbnailUrl ||
    makePlaceholder();


  thumbnail.onerror =
    () => {

      thumbnail.src =
        makePlaceholder();

    };


  document.getElementById(
    "detailTitle"
  ).textContent =
    selectedWork.title ||
    "제목 없음";


  document.getElementById(
    "detailUploader"
  ).textContent =
    `올린 사람: ${
      selectedWork.uploader ||
      "알 수 없음"
    }`;


  document.getElementById(
    "detailDescription"
  ).textContent =
    selectedWork.description ||
    "설명이 없습니다.";


  const typeText =
    selectedWork.type ===
      "webtoon"
      ? "웹툰"
      : "만화";


  document.getElementById(
    "detailType"
  ).textContent =
    typeText;


  document.getElementById(
    "chapterSectionTitle"
  ).textContent =
    selectedWork.type ===
      "webtoon"
      ? "회차"
      : "권";


  document.getElementById(
    "addChapterBtn"
  ).textContent =
    selectedWork.type ===
      "webtoon"
      ? "+ 회차 추가"
      : "+ 권 추가";

}


async function loadChapters() {

  if (
    !selectedWork
  ) {
    return;
  }


  const status =
    document.getElementById(
      "chapterStatus"
    );


  status.textContent =
    "불러오는 중...";


  try {

    const chapterQuery =
      query(
        collection(
          db,
          "works",
          selectedWork.id,
          "chapters"
        ),
        orderBy(
          "number",
          "asc"
        )
      );


    const snapshot =
      await getDocs(
        chapterQuery
      );


    currentChapters =
      snapshot.docs.map(
        item => ({
          id:
            item.id,

          ...item.data()
        })
      );


    status.textContent =
      "";


    renderChapterList();

  } catch (
    error
  ) {

    console.error(
      error
    );

    status.textContent =
      "회차를 불러오지 못했습니다.";

  }

}


function renderChapterList() {

  const container =
    document.getElementById(
      "chapterList"
    );


  const count =
    document.getElementById(
      "chapterCount"
    );


  container.innerHTML =
    "";


  count.textContent =
    `${currentChapters.length}개`;


  if (
    currentChapters.length === 0
  ) {

    container.innerHTML =
      `<div class="status-message">
        등록된 회차가 없습니다.
       </div>`;

    return;

  }


  currentChapters.forEach(
    (
      chapter,
      index
    ) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "chapter-item";


      const main =
        document.createElement(
          "div"
        );

      main.className =
        "chapter-main";


      const name =
        document.createElement(
          "div"
        );

      name.className =
        "chapter-name";


      const unit =
        selectedWork.type ===
          "webtoon"
          ? "화"
          : "권";


      name.textContent =
        `${chapter.number}${unit}` +
        (
          chapter.title
            ? ` · ${chapter.title}`
            : ""
        );


      const date =
        document.createElement(
          "div"
        );

      date.className =
        "chapter-date";

      date.textContent =
        formatTimestamp(
          chapter.createdAt
        );


      main.append(
        name,
        date
      );


      const progress =
        getProgress(
          selectedWork.id,
          chapter.id
        );


      if (
        progress !== null
      ) {

        const badge =
          document.createElement(
            "div"
          );

        badge.className =
          "continue-badge";


        if (
          selectedWork.type ===
          "comic"
        ) {

          badge.textContent =
            `${
              Number(progress) + 1
            }쪽부터`;

        } else {

          badge.textContent =
            "이어보기";

        }


        item.append(
          main,
          badge
        );

      } else {

        item.append(
          main
        );

      }


      item.addEventListener(
        "click",
        () => {

          if (
            selectedWork.type ===
            "webtoon"
          ) {

            openWebtoonEpisode(
              index
            );

          } else {

            openComicVolume(
              index
            );

          }

        }
      );


      container.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   목록/상세 뒤로
========================================================= */

document.getElementById(
  "detailBackBtn"
).addEventListener(
  "click",
  showLibrary
);


document.getElementById(
  "webtoonBackBtn"
).addEventListener(
  "click",
  showDetail
);


document.getElementById(
  "comicBackBtn"
).addEventListener(
  "click",
  showDetail
);


/* =========================================================
   웹툰
========================================================= */

function openWebtoonEpisode(
  index
) {

  if (
    !selectedWork ||
    !currentChapters[index]
  ) {
    return;
  }


  currentEpisodeIndex =
    index;


  const chapter =
    currentChapters[index];


  hideAllPages();

  webtoonViewer.classList.remove(
    "hidden"
  );


  document.getElementById(
    "webtoonViewerTitle"
  ).textContent =
    selectedWork.title;


  document.getElementById(
    "webtoonViewerChapter"
  ).textContent =
    `${chapter.number}화${
      chapter.title
        ? ` · ${chapter.title}`
        : ""
    }`;


  const container =
    document.getElementById(
      "webtoonImages"
    );


  container.innerHTML =
    "";


  const images =
    chapter.images || [];


  images.forEach(
    url => {

      const image =
        document.createElement(
          "img"
        );

      image.src =
        url;

      image.loading =
        "lazy";

      image.alt =
        selectedWork.title;


      container.appendChild(
        image
      );

    }
  );


  updateWebtoonNavigation();


  const saved =
    getProgress(
      selectedWork.id,
      chapter.id
    );


  setTimeout(
    () => {

      window.scrollTo(
        0,
        saved !== null
          ? Number(saved)
          : 0
      );

    },
    100
  );

}


function updateWebtoonNavigation() {

  document.getElementById(
    "prevEpisodeBtn"
  ).disabled =
    currentEpisodeIndex <= 0;


  document.getElementById(
    "nextEpisodeBtn"
  ).disabled =
    currentEpisodeIndex >=
    currentChapters.length - 1;

}


document.getElementById(
  "prevEpisodeBtn"
).addEventListener(
  "click",
  () => {

    if (
      currentEpisodeIndex > 0
    ) {

      openWebtoonEpisode(
        currentEpisodeIndex - 1
      );

    }

  }
);


document.getElementById(
  "nextEpisodeBtn"
).addEventListener(
  "click",
  () => {

    if (
      currentEpisodeIndex <
      currentChapters.length - 1
    ) {

      openWebtoonEpisode(
        currentEpisodeIndex + 1
      );

    }

  }
);


document.getElementById(
  "webtoonTopBtn"
).addEventListener(
  "click",
  () => {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


let scrollSaveTimer =
  null;


window.addEventListener(
  "scroll",
  () => {

    if (
      webtoonViewer.classList
        .contains("hidden") ||
      !selectedWork ||
      !currentChapters[
        currentEpisodeIndex
      ]
    ) {
      return;
    }


    clearTimeout(
      scrollSaveTimer
    );


    scrollSaveTimer =
      setTimeout(
        () => {

          const chapter =
            currentChapters[
              currentEpisodeIndex
            ];


          saveProgress(
            selectedWork.id,
            chapter.id,
            Math.round(
              window.scrollY
            )
          );

        },
        150
      );

  }
);


/* =========================================================
   만화 뷰어
========================================================= */

function openComicVolume(
  index
) {

  if (
    !selectedWork ||
    !currentChapters[index]
  ) {
    return;
  }


  currentVolumeIndex =
    index;


  const chapter =
    currentChapters[index];


  const saved =
    getProgress(
      selectedWork.id,
      chapter.id
    );


  currentPage =
    saved !== null
      ? Number(saved)
      : 0;


  currentPage =
    clampPage(
      currentPage
    );


  hideAllPages();

  comicViewer.classList.remove(
    "hidden"
  );


  document.getElementById(
    "comicViewerTitle"
  ).textContent =
    selectedWork.title;


  document.getElementById(
    "comicViewerVolume"
  ).textContent =
    `${chapter.number}권${
      chapter.title
        ? ` · ${chapter.title}`
        : ""
    }`;


  document.getElementById(
    "directionSelect"
  ).value =
    readingDirection;


  renderComicPages();

  window.scrollTo(
    0,
    0
  );

}


function renderComicPages() {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (
    !chapter
  ) {
    return;
  }


  const pages =
    chapter.images || [];


  const container =
    document.getElementById(
      "comicPages"
    );


  container.innerHTML =
    "";


  container.classList.toggle(
    "double",
    pageMode === 2
  );


  if (
    pages.length === 0
  ) {

    container.innerHTML =
      "<div>페이지가 없습니다.</div>";

    return;

  }


  currentPage =
    clampPage(
      currentPage
    );


  let indexes =
    [currentPage];


  if (
    pageMode === 2 &&
    currentPage + 1 <
      pages.length
  ) {

    indexes.push(
      currentPage + 1
    );

  }


  if (
    readingDirection ===
    "rtl"
  ) {

    indexes =
      [...indexes].reverse();

  }


  indexes.forEach(
    pageIndex => {

      const image =
        document.createElement(
          "img"
        );

      image.className =
        "comic-page";

      image.src =
        pages[pageIndex];

      image.alt =
        `${pageIndex + 1}쪽`;


      container.appendChild(
        image
      );

    }
  );


  updateComicControls();

  saveComicProgress();

}


function moveComic(
  direction
) {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (
    !chapter
  ) {
    return;
  }


  const pages =
    chapter.images || [];


  const step =
    pageMode;


  if (
    direction === "next"
  ) {

    const nextPage =
      currentPage + step;


    if (
      nextPage <
      pages.length
    ) {

      currentPage =
        nextPage;

      renderComicPages();

      return;

    }


    if (
      currentVolumeIndex <
      currentChapters.length - 1
    ) {

      openComicVolume(
        currentVolumeIndex + 1
      );

    }

  }


  if (
    direction === "prev"
  ) {

    const prevPage =
      currentPage - step;


    if (
      prevPage >= 0
    ) {

      currentPage =
        prevPage;

      renderComicPages();

      return;

    }


    if (
      currentVolumeIndex > 0
    ) {

      currentVolumeIndex--;

      const previous =
        currentChapters[
          currentVolumeIndex
        ];


      const previousPages =
        previous.images || [];


      currentPage =
        Math.max(
          0,
          previousPages.length -
          pageMode
        );


      document.getElementById(
        "comicViewerVolume"
      ).textContent =
        `${previous.number}권${
          previous.title
            ? ` · ${previous.title}`
            : ""
        }`;


      renderComicPages();

    }

  }

}


function updateComicControls() {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (
    !chapter
  ) {
    return;
  }


  const pages =
    chapter.images || [];


  const displayedEnd =
    Math.min(
      currentPage +
      pageMode,
      pages.length
    );


  const indicator =
    pageMode === 1
      ? `${currentPage + 1} / ${pages.length}`
      : `${currentPage + 1} - ${displayedEnd} / ${pages.length}`;


  document.getElementById(
    "pageIndicator"
  ).textContent =
    indicator;


  const slider =
    document.getElementById(
      "pageSlider"
    );


  slider.max =
    Math.max(
      0,
      pages.length - 1
    );

  slider.value =
    currentPage;

}


function saveComicProgress() {

  if (
    !selectedWork
  ) {
    return;
  }


  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (
    !chapter
  ) {
    return;
  }


  saveProgress(
    selectedWork.id,
    chapter.id,
    currentPage
  );

}


function clampPage(
  page
) {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (
    !chapter
  ) {
    return 0;
  }


  const pages =
    chapter.images || [];


  if (
    pages.length === 0
  ) {
    return 0;
  }


  return Math.max(
    0,
    Math.min(
      Number(page) || 0,
      pages.length - 1
    )
  );

}


/*
  실제 화면상의 왼쪽/오른쪽 버튼

  RTL:
  왼쪽 = 다음
  오른쪽 = 이전

  LTR:
  왼쪽 = 이전
  오른쪽 = 다음
*/

document.getElementById(
  "comicLeftBtn"
).addEventListener(
  "click",
  () => {

    moveComic(
      readingDirection ===
        "rtl"
        ? "next"
        : "prev"
    );

  }
);


document.getElementById(
  "comicRightBtn"
).addEventListener(
  "click",
  () => {

    moveComic(
      readingDirection ===
        "rtl"
        ? "prev"
        : "next"
    );

  }
);


/* 키보드 */

document.addEventListener(
  "keydown",
  event => {

    if (
      comicViewer.classList
        .contains("hidden")
    ) {
      return;
    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      event.preventDefault();

      moveComic(
        readingDirection ===
          "rtl"
          ? "next"
          : "prev"
      );

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      event.preventDefault();

      moveComic(
        readingDirection ===
          "rtl"
          ? "prev"
          : "next"
      );

    }

  }
);


/* 1장 */

document.getElementById(
  "singlePageBtn"
).addEventListener(
  "click",
  () => {

    pageMode =
      1;

    updatePageModeButtons();

    renderComicPages();

  }
);


/* 2장 */

document.getElementById(
  "doublePageBtn"
).addEventListener(
  "click",
  () => {

    pageMode =
      2;

    updatePageModeButtons();

    renderComicPages();

  }
);


function updatePageModeButtons() {

  document.getElementById(
    "singlePageBtn"
  ).classList.toggle(
    "active",
    pageMode === 1
  );


  document.getElementById(
    "doublePageBtn"
  ).classList.toggle(
    "active",
    pageMode === 2
  );

}


/* 읽기 방향 */

document.getElementById(
  "directionSelect"
).addEventListener(
  "change",
  event => {

    readingDirection =
      event.target.value;


    localStorage.setItem(
      "comicReadingDirection",
      readingDirection
    );


    renderComicPages();

  }
);


/* 슬라이더 */

document.getElementById(
  "pageSlider"
).addEventListener(
  "input",
  event => {

    currentPage =
      Number(
        event.target.value
      );

    renderComicPages();

  }
);


/* 전체화면 */

document.getElementById(
  "fullscreenBtn"
).addEventListener(
  "click",
  async () => {

    try {

      if (
        !document.fullscreenElement
      ) {

        await comicViewer
          .requestFullscreen();

      } else {

        await document
          .exitFullscreen();

      }

    } catch (
      error
    ) {

      console.error(
        error
      );

    }

  }
);


/* =========================================================
   업로드 모달
========================================================= */

document.getElementById(
  "uploadOpenBtn"
).addEventListener(
  "click",
  () => {

    openUploadModal(
      "new"
    );

  }
);


document.getElementById(
  "addChapterBtn"
).addEventListener(
  "click",
  () => {

    if (
      !selectedWork
    ) {
      return;
    }


    openUploadModal(
      "chapter"
    );

  }
);


document.getElementById(
  "uploadCloseBtn"
).addEventListener(
  "click",
  closeUploadModal
);


document
  .querySelector(
    ".modal-overlay"
  )
  .addEventListener(
    "click",
    closeUploadModal
  );


function openUploadModal(
  mode
) {

  uploadMode =
    mode;


  uploadForm.reset();


  resetUploadProgress();


  document.getElementById(
    "uploadError"
  ).textContent =
    "";


  document.getElementById(
    "selectedFileInfo"
  ).textContent =
    "";


  const newFields =
    document.getElementById(
      "newWorkFields"
    );


  const modalTitle =
    document.getElementById(
      "uploadModalTitle"
    );


  const submit =
    document.getElementById(
      "uploadSubmitBtn"
    );


  const type =
    mode === "new"
      ? document.getElementById(
          "uploadType"
        ).value
      : selectedWork.type;


  if (
    mode === "new"
  ) {

    newFields.classList.remove(
      "hidden"
    );

    modalTitle.textContent =
      "새 작품 업로드";

    submit.textContent =
      "작품 업로드";


    document.getElementById(
      "uploadChapterNumber"
    ).value =
      1;


    updateUploadLabels(
      document.getElementById(
        "uploadType"
      ).value
    );

  } else {

    newFields.classList.add(
      "hidden"
    );


    modalTitle.textContent =
      selectedWork.type ===
        "webtoon"
        ? `${selectedWork.title} · 회차 추가`
        : `${selectedWork.title} · 권 추가`;


    submit.textContent =
      selectedWork.type ===
        "webtoon"
        ? "회차 업로드"
        : "권 업로드";


    const maxNumber =
      currentChapters.reduce(
        (
          max,
          chapter
        ) =>
          Math.max(
            max,
            Number(
              chapter.number
            ) || 0
          ),
        0
      );


    document.getElementById(
      "uploadChapterNumber"
    ).value =
      maxNumber + 1;


    updateUploadLabels(
      type
    );

  }


  uploadModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );

}


function closeUploadModal() {

  if (
    uploadSubmitBtn.disabled
  ) {
    return;
  }


  uploadModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}


document.getElementById(
  "uploadType"
).addEventListener(
  "change",
  event => {

    updateUploadLabels(
      event.target.value
    );

  }
);


function updateUploadLabels(
  type
) {

  const number =
    document.getElementById(
      "chapterNumberLabel"
    );


  const title =
    document.getElementById(
      "chapterTitleLabel"
    );


  if (
    type === "webtoon"
  ) {

    number.textContent =
      "회차 번호";

    title.textContent =
      "회차 제목";

  } else {

    number.textContent =
      "권 번호";

    title.textContent =
      "권 제목";

  }

}


/* 파일 선택 표시 */

document.getElementById(
  "uploadImages"
).addEventListener(
  "change",
  event => {

    const files =
      Array.from(
        event.target.files
      );


    document.getElementById(
      "selectedFileInfo"
    ).textContent =
      files.length > 0
        ? `본문 이미지 ${files.length}장 선택됨`
        : "";

  }
);


/* =========================================================
   실제 업로드
========================================================= */

uploadForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (
      uploadMode === "new"
    ) {

      await uploadNewWork();

    } else {

      await uploadNewChapter();

    }

  }
);


/* 새 작품 */

async function uploadNewWork() {

  const type =
    document.getElementById(
      "uploadType"
    ).value;


  const title =
    document.getElementById(
      "uploadTitle"
    ).value.trim();


  const uploader =
    document.getElementById(
      "uploadUploader"
    ).value.trim();


  const description =
    document.getElementById(
      "uploadDescription"
    ).value.trim();


  const thumbnail =
    document.getElementById(
      "uploadThumbnail"
    ).files[0];


  const chapterNumber =
    Number(
      document.getElementById(
        "uploadChapterNumber"
      ).value
    );


  const chapterTitle =
    document.getElementById(
      "uploadChapterTitle"
    ).value.trim();


  const pageFiles =
    sortImageFiles(
      document.getElementById(
        "uploadImages"
      ).files
    );


  if (
    !title
  ) {

    showUploadError(
      "작품 제목을 입력해주세요."
    );

    return;

  }


  if (
    !uploader
  ) {

    showUploadError(
      "올린 사람 이름을 입력해주세요."
    );

    return;

  }


  if (
    !thumbnail
  ) {

    showUploadError(
      "표지 이미지를 선택해주세요."
    );

    return;

  }


  if (
    pageFiles.length === 0
  ) {

    showUploadError(
      "본문 이미지를 선택해주세요."
    );

    return;

  }


  setUploadBusy(
    true
  );


  try {

    setProgress(
      1,
      "작품 정보 생성 중..."
    );


    /*
      Firestore 작품 문서를 먼저 만든다.
      자동 ID를 Storage 경로에도 사용한다.
    */

    const workReference =
      await addDoc(
        collection(
          db,
          "works"
        ),
        {
          title,
          type,
          uploader,
          description,

          thumbnailUrl:
            "",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );


    /*
      표지 업로드
    */

    setProgress(
      5,
      "표지 업로드 중..."
    );


    const thumbnailPath =
      `works/${workReference.id}/thumbnail/${Date.now()}_${cleanFilename(thumbnail.name)}`;


    const thumbnailUrl =
      await uploadFile(
        thumbnail,
        thumbnailPath,
        progress => {

          const percent =
            5 +
            progress * 0.1;

          setProgress(
            percent,
            "표지 업로드 중..."
          );

        }
      );


    /*
      Firestore에 표지 URL 기록
    */

    await updateDoc(
      workReference,
      {
        thumbnailUrl
      }
    );


    /*
      첫 회차 문서 ID를 미리 생성
    */

    const chapterReference =
      doc(
        collection(
          db,
          "works",
          workReference.id,
          "chapters"
        )
      );


    /*
      본문 이미지
    */

    const imageUrls =
      await uploadChapterImages(
        workReference.id,
        chapterReference.id,
        pageFiles,
        15,
        95
      );


    /*
      회차 정보 저장
    */

    await setDoc(
      chapterReference,
      {
        number:
          chapterNumber,

        title:
          chapterTitle,

        images:
          imageUrls,

        imageCount:
          imageUrls.length,

        createdAt:
          serverTimestamp()
      }
    );


    setProgress(
      100,
      "업로드 완료!"
    );


    setTimeout(
      () => {

        setUploadBusy(
          false
        );

        closeUploadModal();

      },
      350
    );

  } catch (
    error
  ) {

    console.error(
      "업로드 실패:",
      error
    );


    setUploadBusy(
      false
    );


    showUploadError(
      firebaseErrorMessage(
        error
      )
    );

  }

}


/* 기존 작품에 회차 추가 */

async function uploadNewChapter() {

  if (
    !selectedWork
  ) {
    return;
  }


  const chapterNumber =
    Number(
      document.getElementById(
        "uploadChapterNumber"
      ).value
    );


  const chapterTitle =
    document.getElementById(
      "uploadChapterTitle"
    ).value.trim();


  const pageFiles =
    sortImageFiles(
      document.getElementById(
        "uploadImages"
      ).files
    );


  if (
    !chapterNumber ||
    chapterNumber < 1
  ) {

    showUploadError(
      "번호를 올바르게 입력해주세요."
    );

    return;

  }


  if (
    currentChapters.some(
      chapter =>
        Number(
          chapter.number
        ) ===
        chapterNumber
    )
  ) {

    showUploadError(
      `${
        selectedWork.type ===
          "webtoon"
          ? "회차"
          : "권"
      } 번호 ${chapterNumber}은 이미 존재합니다.`
    );

    return;

  }


  if (
    pageFiles.length === 0
  ) {

    showUploadError(
      "본문 이미지를 선택해주세요."
    );

    return;

  }


  setUploadBusy(
    true
  );


  try {

    const chapterReference =
      doc(
        collection(
          db,
          "works",
          selectedWork.id,
          "chapters"
        )
      );


    const imageUrls =
      await uploadChapterImages(
        selectedWork.id,
        chapterReference.id,
        pageFiles,
        0,
        95
      );


    setProgress(
      97,
      "회차 정보 저장 중..."
    );


    await setDoc(
      chapterReference,
      {
        number:
          chapterNumber,

        title:
          chapterTitle,

        images:
          imageUrls,

        imageCount:
          imageUrls.length,

        createdAt:
          serverTimestamp()
      }
    );


    await updateDoc(
      doc(
        db,
        "works",
        selectedWork.id
      ),
      {
        updatedAt:
          serverTimestamp()
      }
    );


    setProgress(
      100,
      "업로드 완료!"
    );


    await loadChapters();


    setTimeout(
      () => {

        setUploadBusy(
          false
        );

        closeUploadModal();

      },
      350
    );

  } catch (
    error
  ) {

    console.error(
      error
    );


    setUploadBusy(
      false
    );


    showUploadError(
      firebaseErrorMessage(
        error
      )
    );

  }

}


/* =========================================================
   여러 이미지 순차 업로드
========================================================= */

async function uploadChapterImages(
  workId,
  chapterId,
  files,
  startPercent,
  endPercent
) {

  const urls =
    [];


  const range =
    endPercent -
    startPercent;


  for (
    let i = 0;
    i < files.length;
    i++
  ) {

    const file =
      files[i];


    const number =
      String(
        i + 1
      ).padStart(
        4,
        "0"
      );


    const extension =
      getExtension(
        file.name
      );


    const filename =
      extension
        ? `${number}.${extension}`
        : number;


    const path =
      `works/${workId}/chapters/${chapterId}/${filename}`;


    const fileStart =
      startPercent +
      range *
      (i / files.length);


    const fileEnd =
      startPercent +
      range *
      ((i + 1) / files.length);


    const url =
      await uploadFile(
        file,
        path,
        progress => {

          const percent =
            fileStart +
            (
              fileEnd -
              fileStart
            ) *
            (
              progress /
              100
            );


          setProgress(
            percent,
            `이미지 업로드 중 · ${i + 1} / ${files.length}`
          );

        }
      );


    urls.push(
      url
    );

  }


  return urls;

}


/* =========================================================
   Storage 파일 1개 업로드
========================================================= */

async function uploadFile(file, path, onProgress) {

  return new Promise((resolve, reject) => {

    const uploadUrl =
      `${R2_CONFIG.workerUrl}/upload?path=${encodeURIComponent(path)}`;

    console.log("R2 업로드 요청:", uploadUrl);

    const xhr = new XMLHttpRequest();

    xhr.open("POST", uploadUrl);

    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );

    xhr.upload.addEventListener("progress", event => {

      if (event.lengthComputable && onProgress) {

        const percent =
          (event.loaded / event.total) * 100;

        onProgress(percent);
      }

    });

    xhr.addEventListener("load", () => {

      console.log("Worker 상태:", xhr.status);
      console.log("Worker 응답:", xhr.responseText);

      if (xhr.status < 200 || xhr.status >= 300) {

        reject(
          new Error(
            `R2 업로드 실패 (${xhr.status}): ${xhr.responseText}`
          )
        );

        return;
      }

      try {

        const result =
          JSON.parse(xhr.responseText);

        if (!result.publicUrl) {

          throw new Error(
            "Worker 응답에 publicUrl이 없습니다."
          );
        }

        resolve(result.publicUrl);

      } catch (error) {

        reject(
          new Error(
            `Worker가 올바른 JSON을 반환하지 않았습니다: ${xhr.responseText}`
          )
        );

      }

    });

    xhr.addEventListener("error", () => {

      reject(
        new Error(
          "Cloudflare Worker 연결에 실패했습니다."
        )
      );

    });

    xhr.send(file);

  });

}

function uploadToPresignedUrl(
  file,
  uploadUrl,
  onProgress
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const xhr =
        new XMLHttpRequest();


      xhr.open(
        "PUT",
        uploadUrl
      );


      xhr.setRequestHeader(
        "Content-Type",
        file.type ||
        "application/octet-stream"
      );


      xhr.upload.addEventListener(
        "progress",
        event => {

          if (
            event.lengthComputable &&
            onProgress
          ) {

            const percent =
              (
                event.loaded /
                event.total
              ) * 100;


            onProgress(
              percent
            );

          }

        }
      );


      xhr.addEventListener(
        "load",
        () => {

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {

            resolve();

          } else {

            reject(
              new Error(
                `R2 업로드 실패 (${xhr.status})`
              )
            );

          }

        }
      );


      xhr.addEventListener(
        "error",
        () => {

          reject(
            new Error(
              "R2 업로드 중 네트워크 오류가 발생했습니다."
            )
          );

        }
      );


      xhr.send(
        file
      );

    }
  );

}

/* =========================================================
   업로드 진행 UI
========================================================= */

function setUploadBusy(
  busy
) {

  uploadSubmitBtn.disabled =
    busy;


  document.getElementById(
    "uploadCloseBtn"
  ).disabled =
    busy;


  if (
    busy
  ) {

    document.getElementById(
      "uploadProgressArea"
    ).classList.remove(
      "hidden"
    );


    document.getElementById(
      "uploadError"
    ).textContent =
      "";

  }

}


function resetUploadProgress() {

  uploadSubmitBtn.disabled =
    false;


  document.getElementById(
    "uploadCloseBtn"
  ).disabled =
    false;


  document.getElementById(
    "uploadProgressArea"
  ).classList.add(
    "hidden"
  );


  document.getElementById(
    "uploadProgressBar"
  ).style.width =
    "0%";


  document.getElementById(
    "uploadPercent"
  ).textContent =
    "0%";

}


function setProgress(
  percent,
  text
) {

  const safe =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          percent
        )
      )
    );


  document.getElementById(
    "uploadProgressArea"
  ).classList.remove(
    "hidden"
  );


  document.getElementById(
    "uploadProgressBar"
  ).style.width =
    `${safe}%`;


  document.getElementById(
    "uploadPercent"
  ).textContent =
    `${safe}%`;


  document.getElementById(
    "uploadProgressText"
  ).textContent =
    text;

}


function showUploadError(
  text
) {

  document.getElementById(
    "uploadError"
  ).textContent =
    text;

}


/* =========================================================
   읽은 위치 저장
========================================================= */

function progressKey(
  workId,
  chapterId
) {

  return (
    `comicViewerProgress:` +
    `${workId}:` +
    `${chapterId}`
  );

}


function saveProgress(
  workId,
  chapterId,
  value
) {

  localStorage.setItem(
    progressKey(
      workId,
      chapterId
    ),
    String(value)
  );

}


function getProgress(
  workId,
  chapterId
) {

  const value =
    localStorage.getItem(
      progressKey(
        workId,
        chapterId
      )
    );


  return value === null
    ? null
    : value;

}


/* =========================================================
   다크모드
========================================================= */

const darkModeBtn =
  document.getElementById(
    "darkModeBtn"
  );


if (
  localStorage.getItem(
    "darkMode"
  ) === "true"
) {

  document.body.classList.add(
    "dark"
  );

}


updateDarkModeIcon();


darkModeBtn.addEventListener(
  "click",
  () => {

    document.body.classList.toggle(
      "dark"
    );


    const enabled =
      document.body.classList
        .contains("dark");


    localStorage.setItem(
      "darkMode",
      enabled
    );


    updateDarkModeIcon();

  }
);


function updateDarkModeIcon() {

  darkModeBtn.textContent =
    document.body.classList
      .contains("dark")
      ? "☀️"
      : "🌙";

}


/* =========================================================
   기타 함수
========================================================= */

function sortImageFiles(
  fileList
) {

  return Array.from(
    fileList
  ).sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      )
  );

}


function cleanFilename(
  filename
) {

  return filename
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(
      0,
      100
    );

}


function getExtension(
  filename
) {

  const parts =
    filename.split(
      "."
    );


  if (
    parts.length < 2
  ) {
    return "";
  }


  return parts
    .pop()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}


function formatTimestamp(
  timestamp
) {

  if (
    !timestamp ||
    !timestamp.toDate
  ) {

    return "";

  }


  return timestamp
    .toDate()
    .toLocaleDateString(
      "ko-KR"
    );

}


function makePlaceholder() {

  const svg =
    `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="600"
      height="800"
    >
      <rect
        width="100%"
        height="100%"
        fill="#dddddd"
      />

      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial"
        font-size="35"
        fill="#777777"
      >
        NO COVER
      </text>
    </svg>
    `;


  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      svg
    )
  );

}


function firebaseErrorMessage(
  error
) {

  const code =
    error?.code || "";


  if (
    code.includes(
      "permission-denied"
    ) ||
    code.includes(
      "unauthorized"
    )
  ) {

    return "Firebase 권한이 없습니다. Firestore / Storage 보안 규칙을 확인해주세요.";

  }


  if (
    code.includes(
      "storage/unauthorized"
    )
  ) {

    return "Storage 업로드 권한이 없습니다.";

  }


  return (
    error?.message ||
    "업로드 중 오류가 발생했습니다."
  );

}
