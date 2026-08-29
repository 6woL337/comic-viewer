import {
  db
} from "./firebase-config.js";


import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const R2_CONFIG = {
  workerUrl: "https://comic-upload.w82733037.workers.dev"
};

const batchId =
  Date.now();

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

let editingChapterId =
  null;

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

const readingDirection =
  "ltr";


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


/* =========================================================
   작품 수정 모달
========================================================= */

const editWorkModal =
  document.getElementById(
    "editWorkModal"
  );

const editWorkForm =
  document.getElementById(
    "editWorkForm"
  );

const editWorkTitle =
  document.getElementById(
    "editWorkTitle"
  );

const editWorkUploader =
  document.getElementById(
    "editWorkUploader"
  );

const editWorkDescription =
  document.getElementById(
    "editWorkDescription"
  );

const editWorkError =
  document.getElementById(
    "editWorkError"
  );

const editWorkSaveBtn =
  document.getElementById(
    "editWorkSaveBtn"
  );

  const editWorkThumbnail =
  document.getElementById(
    "editWorkThumbnail"
  );

const editWorkThumbnailInfo =
  document.getElementById(
    "editWorkThumbnailInfo"
  );

editWorkThumbnail.addEventListener(
  "change",
  event => {

    const file =
      event.target.files[0];

    editWorkThumbnailInfo.textContent =
      file
        ? `새 썸네일: ${file.name}`
        : "기존 썸네일 유지";
  }
);

document
  .getElementById(
    "editWorkBtn"
  )
  .addEventListener(
    "click",
    openEditWorkModal
  );


document
  .getElementById(
    "editWorkCloseBtn"
  )
  .addEventListener(
    "click",
    closeEditWorkModal
  );


editWorkModal
  .querySelector(
    ".modal-overlay"
  )
  .addEventListener(
    "click",
    closeEditWorkModal
  );


function openEditWorkModal() {

  if (
    !selectedWork
  ) {
    return;
  }


  editWorkTitle.value =
    selectedWork.title ||
    "";


  editWorkUploader.value =
    selectedWork.uploader ||
    "";


  editWorkDescription.value =
    selectedWork.description ||
    "";


  editWorkError.textContent =
    "";

editWorkThumbnail.value =
  "";

editWorkThumbnailInfo.textContent =
  "기존 썸네일 유지";


  editWorkModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  setTimeout(
    () => {

      editWorkTitle.focus();

    },
    50
  );

}


function closeEditWorkModal() {

  if (
    editWorkSaveBtn.disabled
  ) {
    return;
  }


  editWorkModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );

}


/* =========================================================
   작품 수정 저장
========================================================= */

editWorkForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (
      !selectedWork
    ) {
      return;
    }


    const title =
      editWorkTitle.value.trim();


    const uploader =
      editWorkUploader.value.trim();


    const description =
      editWorkDescription.value.trim();


    const newThumbnail =
      editWorkThumbnail.files[0] ||
      null;


    if (
      !title
    ) {

      editWorkError.textContent =
        "작품 제목을 입력해주세요.";

      editWorkTitle.focus();

      return;
    }


    if (
      !uploader
    ) {

      editWorkError.textContent =
        "올린 사람을 입력해주세요.";

      editWorkUploader.focus();

      return;
    }


    editWorkSaveBtn.disabled =
      true;


    editWorkSaveBtn.textContent =
      "저장 중...";


    editWorkError.textContent =
      "";


    let newThumbnailUrl =
      selectedWork.thumbnailUrl ||
      "";


    let uploadedThumbnailUrl =
      null;


    try {

      /* =========================
         새 썸네일 업로드
      ========================= */

      if (
        newThumbnail
      ) {

        editWorkSaveBtn.textContent =
          "썸네일 업로드 중...";

        const convertedThumbnail =
  await convertImageToWebP(
    newThumbnail,
    {
      quality: 0.82,
      maxWidth: 1200
    }
  );


const thumbnailPath =
  `works/${selectedWork.id}/thumbnail/${Date.now()}_thumbnail.webp`;


uploadedThumbnailUrl =
  await uploadFile(
    convertedThumbnail,
    thumbnailPath
  );


        newThumbnailUrl =
          uploadedThumbnailUrl;
      }


      /* =========================
         Firestore 수정
      ========================= */

      editWorkSaveBtn.textContent =
        "정보 저장 중...";


      const oldThumbnailUrl =
        selectedWork.thumbnailUrl ||
        "";


      await updateDoc(
        doc(
          db,
          "works",
          selectedWork.id
        ),
        {
          title,
          uploader,
          description,

          thumbnailUrl:
            newThumbnailUrl,

          updatedAt:
            serverTimestamp()
        }
      );


      selectedWork = {
        ...selectedWork,
        title,
        uploader,
        description,

        thumbnailUrl:
          newThumbnailUrl
      };


      renderDetailInfo();


      /* =========================
         기존 썸네일 삭제
      ========================= */

      if (
        newThumbnail &&
        oldThumbnailUrl &&
        oldThumbnailUrl !==
          newThumbnailUrl
      ) {

        try {

          await deleteR2File(
            oldThumbnailUrl
          );

        } catch (
          deleteError
        ) {

          console.warn(
            "기존 썸네일 삭제 실패:",
            deleteError
          );
        }
      }


      editWorkSaveBtn.disabled =
        false;


      editWorkSaveBtn.textContent =
        "수정 저장";


      closeEditWorkModal();


      alert(
        "작품 정보가 수정되었습니다."
      );


    } catch (
      error
    ) {

      console.error(
        "작품 수정 실패:",
        error
      );


      /*
        새 썸네일은 업로드됐지만
        Firestore 저장이 실패한 경우
        새 파일 정리
      */

      if (
        uploadedThumbnailUrl &&
        uploadedThumbnailUrl !==
          selectedWork.thumbnailUrl
      ) {

        try {

          await deleteR2File(
            uploadedThumbnailUrl
          );

        } catch (
          cleanupError
        ) {

          console.warn(
            "실패한 새 썸네일 정리 실패:",
            cleanupError
          );
        }
      }


      editWorkError.textContent =
        firebaseErrorMessage(
          error
        );


      editWorkSaveBtn.disabled =
        false;


      editWorkSaveBtn.textContent =
        "수정 저장";
    }
  }
);

/* =========================================================
   이미지 Preload
========================================================= */

const preloadedImageUrls =
  new Set();


function preloadImage(
  url
) {

  if (
    !url ||
    preloadedImageUrls.has(
      url
    )
  ) {
    return;
  }


  preloadedImageUrls.add(
    url
  );


  const image =
    new Image();


  image.decoding =
    "async";


  image.src =
    url;
}

function preloadComicPages() {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];


  if (!chapter) {
    return;
  }


  const pages =
    chapter.images ||
    [];


  /*
    이전 2장
    다음 4장
  */

  const offsets =
    [
      -2,
      -1,
      1,
      2,
      3,
      4
    ];


  offsets.forEach(
    offset => {

      const index =
        currentPage +
        offset;


      if (
        index >= 0 &&
        index < pages.length
      ) {

        preloadImage(
          pages[index]
        );
      }

    }
  );


  /*
    현재 권의 끝에 가까우면
    다음 권 첫 이미지도 미리 로딩
  */

  if (
    currentPage >=
      pages.length - 4 &&
    currentVolumeIndex <
      currentChapters.length - 1
  ) {

    const nextChapter =
      currentChapters[
        currentVolumeIndex + 1
      ];


    const nextPages =
      nextChapter?.images ||
      [];


    nextPages
      .slice(
        0,
        2
      )
      .forEach(
        preloadImage
      );
  }
}

/* =========================================================
   회차 불러오기
========================================================= */

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
        등록된 ${
          selectedWork?.type === "comic"
            ? "권"
            : "회차"
        }가 없습니다.
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


      /* =========================
         왼쪽 회차 정보
      ========================= */

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


      /* =========================
         오른쪽 영역
      ========================= */

      const right =
        document.createElement(
          "div"
        );

      right.className =
        "chapter-actions";


      /* 이어보기 표시 */

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


        right.appendChild(
          badge
        );
      }


      /* =========================
         수정 버튼
      ========================= */

      const editButton =
        document.createElement(
          "button"
        );

      editButton.type =
        "button";

      editButton.className =
        "chapter-action-button";

      editButton.textContent =
        "수정";


      editButton.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          openEditChapterModal(
            chapter
          );
        }
      );


      /* =========================
         삭제 버튼
      ========================= */

      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.type =
        "button";

      deleteButton.className =
        "chapter-action-button delete";

      deleteButton.textContent =
        "삭제";


      deleteButton.addEventListener(
        "click",
        async event => {

          event.stopPropagation();

          await deleteChapter(
            chapter
          );
        }
      );


      right.append(
        editButton,
        deleteButton
      );


      item.append(
        main,
        right
      );


      /* =========================
         회차 클릭 → 뷰어
      ========================= */

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
   회차 / 권 수정 모달
========================================================= */

const editChapterModal =
  document.getElementById(
    "editChapterModal"
  );

const editChapterForm =
  document.getElementById(
    "editChapterForm"
  );

const editChapterNumber =
  document.getElementById(
    "editChapterNumber"
  );

const editChapterTitle =
  document.getElementById(
    "editChapterTitle"
  );

const editChapterError =
  document.getElementById(
    "editChapterError"
  );

const editChapterSaveBtn =
  document.getElementById(
    "editChapterSaveBtn"
  );

  const editChapterImages =
  document.getElementById(
    "editChapterImages"
  );

const editChapterImagesInfo =
  document.getElementById(
    "editChapterImagesInfo"
  );

editChapterImages.addEventListener(
  "change",
  event => {

    const files =
      Array.from(
        event.target.files
      );


    editChapterImagesInfo.textContent =
      files.length > 0
        ? `새 본문 이미지 ${files.length}장 선택됨`
        : "기존 본문 이미지 유지";
  }
);

function openEditChapterModal(
  chapter
) {

  if (
    !selectedWork ||
    !chapter
  ) {
    return;
  }


  editingChapterId =
    chapter.id;


  const isWebtoon =
    selectedWork.type ===
    "webtoon";


  document.getElementById(
    "editChapterModalTitle"
  ).textContent =
    isWebtoon
      ? "회차 수정"
      : "권 수정";


  document.getElementById(
    "editChapterNumberLabel"
  ).textContent =
    isWebtoon
      ? "회차 번호"
      : "권 번호";


  document.getElementById(
    "editChapterTitleLabel"
  ).textContent =
    isWebtoon
      ? "회차 제목"
      : "권 제목";


  editChapterNumber.value =
    chapter.number;


  editChapterTitle.value =
    chapter.title || "";


  editChapterError.textContent =
    "";

    editChapterImages.value =
  "";

editChapterImagesInfo.textContent =
  `기존 본문 이미지 ${
    chapter.images?.length || 0
  }장 유지`;

  editChapterModal.classList.remove(
    "hidden"
  );


  document.body.classList.add(
    "modal-open"
  );


  setTimeout(
    () => {

      editChapterNumber.focus();
      editChapterNumber.select();

    },
    50
  );
}


function closeEditChapterModal() {

  if (
    editChapterSaveBtn.disabled
  ) {
    return;
  }


  editingChapterId =
    null;


  editChapterModal.classList.add(
    "hidden"
  );


  document.body.classList.remove(
    "modal-open"
  );
}


document
  .getElementById(
    "editChapterCloseBtn"
  )
  .addEventListener(
    "click",
    closeEditChapterModal
  );


editChapterModal
  .querySelector(
    ".modal-overlay"
  )
  .addEventListener(
    "click",
    closeEditChapterModal
  );


editChapterForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (
      !selectedWork ||
      !editingChapterId
    ) {
      return;
    }


    const number =
      Number(
        editChapterNumber.value
      );


    const title =
      editChapterTitle.value.trim();


    const newImageFiles =
      sortImageFiles(
        editChapterImages.files
      );


    if (
      !Number.isInteger(number) ||
      number < 1
    ) {

      editChapterError.textContent =
        "번호를 올바르게 입력해주세요.";

      editChapterNumber.focus();

      return;
    }


    const duplicate =
      currentChapters.some(
        chapter =>
          chapter.id !==
            editingChapterId &&
          Number(
            chapter.number
          ) === number
      );


    if (
      duplicate
    ) {

      const unit =
        selectedWork.type ===
          "webtoon"
          ? "회차"
          : "권";


      editChapterError.textContent =
        `${unit} 번호 ${number}은 이미 존재합니다.`;

      editChapterNumber.focus();

      return;
    }


    const chapter =
      currentChapters.find(
        item =>
          item.id ===
          editingChapterId
      );


    if (
      !chapter
    ) {

      editChapterError.textContent =
        "수정할 회차를 찾을 수 없습니다.";

      return;
    }


    editChapterSaveBtn.disabled =
      true;


    editChapterSaveBtn.textContent =
      "저장 중...";


    editChapterError.textContent =
      "";


    const oldImages =
      [...(
        chapter.images ||
        []
      )];


    let newImageUrls =
      oldImages;


    let uploadedNewImages =
      [];


    try {

      /* =========================
         새 본문 이미지 업로드
      ========================= */

      if (
        newImageFiles.length > 0
      ) {

        editChapterSaveBtn.textContent =
          "새 이미지 업로드 중...";


        newImageUrls =
          await uploadChapterImages(
            selectedWork.id,
            editingChapterId,
            newImageFiles,
            0,
            100
          );


          console.log(
  "Firestore 수정 직전",
  {
    workId:
      selectedWork.id,

    chapterId:
      editingChapterId,

    newImageUrls
  }
);

        uploadedNewImages =
          [...newImageUrls];
      }


      /* =========================
         Firestore 회차 수정
      ========================= */

      editChapterSaveBtn.textContent =
        "정보 저장 중...";


      await updateDoc(
        doc(
          db,
          "works",
          selectedWork.id,
          "chapters",
          editingChapterId
        ),
        {
          number,
          title,

          images:
            newImageUrls,

          imageCount:
            newImageUrls.length
        }
      );

      console.log(
  "회차 Firestore 업데이트 성공"
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

      console.log(
  "작품 updatedAt 업데이트 성공"
);


      /* =========================
         기존 이미지 삭제
      ========================= */

      if (
        newImageFiles.length > 0
      ) {

        editChapterSaveBtn.textContent =
          "기존 이미지 정리 중...";


        for (
          const imageUrl
          of oldImages
        ) {

          /*
            같은 URL은 삭제하지 않음
          */

          if (
            !newImageUrls.includes(
              imageUrl
            )
          ) {

            try {

              await deleteR2File(
                imageUrl
              );

            } catch (
              deleteError
            ) {

              console.warn(
                "기존 이미지 삭제 실패:",
                deleteError
              );
            }
          }
        }


        /*
          이미지가 바뀌었으므로
          이전 읽기 위치 초기화
        */

        localStorage.removeItem(
          progressKey(
            selectedWork.id,
            editingChapterId
          )
        );
      }


      editChapterSaveBtn.disabled =
        false;


      editChapterSaveBtn.textContent =
        "수정 저장";


      closeEditChapterModal();


      await loadChapters();


      alert(
        selectedWork.type ===
          "webtoon"
          ? "회차가 수정되었습니다."
          : "권이 수정되었습니다."
      );


    } catch (
      error
    ) {

      console.error(
        "회차/권 수정 실패:",
        error
      );


      /*
        새 이미지 업로드는 됐지만
        Firestore 업데이트가 실패한 경우
        새로 올린 이미지 정리
      */

      if (
        uploadedNewImages.length > 0
      ) {

        for (
          const imageUrl
          of uploadedNewImages
        ) {

          try {

            await deleteR2File(
              imageUrl
            );

          } catch (
            cleanupError
          ) {

            console.warn(
              "실패한 새 이미지 정리 실패:",
              cleanupError
            );
          }
        }
      }


      editChapterError.textContent =
        firebaseErrorMessage(
          error
        );


      editChapterSaveBtn.disabled =
        false;


      editChapterSaveBtn.textContent =
        "수정 저장";
    }
  }
);


/* =========================================================
   회차 / 권 삭제
========================================================= */

async function deleteChapter(
  chapter
) {

  if (
    !selectedWork ||
    !chapter
  ) {
    return;
  }


  const unit =
    selectedWork.type ===
      "webtoon"
      ? "화"
      : "권";


  const label =
    `${chapter.number}${unit}` +
    (
      chapter.title
        ? ` · ${chapter.title}`
        : ""
    );


  const confirmed =
    confirm(
      `"${label}"을 정말 삭제하시겠습니까?\n\n` +
      `본문 이미지와 Firestore 데이터가 함께 삭제됩니다.\n` +
      `이 작업은 되돌릴 수 없습니다.`
    );


  if (
    !confirmed
  ) {
    return;
  }


  try {

    const workId =
      selectedWork.id;


    const chapterId =
      chapter.id;


    const images =
      chapter.images || [];


    console.log(
      "회차/권 삭제 시작:",
      chapterId
    );


    /*
      1. R2 이미지 삭제
    */

    for (
      const imageUrl
      of images
    ) {

      await deleteR2File(
        imageUrl
      );
    }


    /*
      2. Firestore chapter 삭제
    */

    await deleteDoc(
      doc(
        db,
        "works",
        workId,
        "chapters",
        chapterId
      )
    );


    /*
      3. 작품 수정 시간 갱신
    */

    await updateDoc(
      doc(
        db,
        "works",
        workId
      ),
      {
        updatedAt:
          serverTimestamp()
      }
    );


    /*
      4. 해당 회차 읽기 기록 삭제
    */

    localStorage.removeItem(
      `comicViewerProgress:${workId}:${chapterId}`
    );


    /*
      5. 화면 갱신
    */

    await loadChapters();


    alert(
      `${label}이 삭제되었습니다.`
    );


  } catch (
    error
  ) {

    console.error(
      "회차/권 삭제 실패:",
      error
    );


    alert(
      "삭제 중 오류가 발생했습니다.\n\n" +
      firebaseErrorMessage(
        error
      )
    );
  }
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
  (
    url,
    index
  ) => {

    const image =
      document.createElement(
        "img"
      );


    image.src =
      url;


    /*
      첫 2장은 바로 로딩,
      나머지는 lazy
    */

    image.loading =
      index < 2
        ? "eager"
        : "lazy";


    image.decoding =
      "async";


    image.alt =
      selectedWork.title;


    /*
      이 이미지가 로드되면
      앞으로 몇 장을 미리 받음
    */

    image.addEventListener(
      "load",
      () => {

        preloadWebtoonAround(
          chapter,
          index
        );

      },
      {
        once: true
      }
    );


    container.appendChild(
      image
    );
  }
);

images
  .slice(
    0,
    4
  )
  .forEach(
    preloadImage
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

function preloadWebtoonAround(
  chapter,
  currentIndex
) {

  if (!chapter) {
    return;
  }


  const images =
    chapter.images ||
    [];


  /*
    앞으로 4장
  */

  for (
    let i =
      currentIndex + 1;
    i <=
      currentIndex + 4;
    i++
  ) {

    if (
      i <
      images.length
    ) {

      preloadImage(
        images[i]
      );
    }
  }


  /*
    회차 마지막에 가까우면
    다음 회차 첫 2장도 preload
  */

  if (
    currentIndex >=
      images.length - 3 &&
    currentEpisodeIndex <
      currentChapters.length - 1
  ) {

    const nextChapter =
      currentChapters[
        currentEpisodeIndex + 1
      ];


    const nextImages =
      nextChapter?.images ||
      [];


    nextImages
      .slice(
        0,
        2
      )
      .forEach(
        preloadImage
      );
  }
}

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

  preloadComicPages();

}


function moveComic(
  direction
) {

  const chapter =
    currentChapters[
      currentVolumeIndex
    ];

  if (!chapter) {
    return;
  }


  const pages =
    chapter.images || [];


  /* =========================
     다음
  ========================= */

  if (
    direction === "next"
  ) {

    const nextPage =
      currentPage +
      pageMode;


    if (
      nextPage <
      pages.length
    ) {

      currentPage =
        nextPage;

      renderComicPages();

      return;
    }


    /* 다음 권 */

    if (
      currentVolumeIndex <
      currentChapters.length - 1
    ) {

      openComicVolume(
        currentVolumeIndex + 1
      );

    }

    return;
  }


  /* =========================
     이전
  ========================= */

  if (
    direction === "prev"
  ) {

    /*
      현재 권에서 아직 앞 페이지가 있으면
      무조건 0 이하로 떨어지지 않게 이동
    */

    if (
      currentPage > 0
    ) {

      currentPage =
        Math.max(
          0,
          currentPage - pageMode
        );


      /*
        2페이지 보기일 때
        0,2,4,6... 위치로 맞춤
      */

      if (
        pageMode === 2
      ) {

        currentPage =
          Math.floor(
            currentPage / 2
          ) * 2;

      }


      renderComicPages();

      return;
    }


    /* =========================
       이전 권
    ========================= */

    if (
      currentVolumeIndex > 0
    ) {

      currentVolumeIndex--;


      const previousChapter =
        currentChapters[
          currentVolumeIndex
        ];


      const previousPages =
        previousChapter.images ||
        [];


      /*
        이전 권의 마지막 보기 위치 계산
      */

      if (
        pageMode === 2
      ) {

        currentPage =
          Math.max(
            0,
            Math.floor(
              (
                previousPages.length - 1
              ) / 2
            ) * 2
          );

      } else {

        currentPage =
          Math.max(
            0,
            previousPages.length - 1
          );

      }


      document.getElementById(
        "comicViewerVolume"
      ).textContent =
        `${previousChapter.number}권${
          previousChapter.title
            ? ` · ${previousChapter.title}`
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


/* =========================================================
   만화 버튼
========================================================= */

document.getElementById(
  "comicLeftBtn"
).addEventListener(
  "click",
  () => {

    moveComic(
      "prev"
    );

  }
);


document.getElementById(
  "comicRightBtn"
).addEventListener(
  "click",
  () => {

    moveComic(
      "next"
    );

  }
);

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
        "prev"
      );

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      event.preventDefault();

      moveComic(
        "next"
      );

    }

  }
);

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


document.getElementById(
  "doublePageBtn"
).addEventListener(
  "click",
  () => {

    pageMode =
      2;


    /*
      2페이지 보기 시작점을
      0, 2, 4, 6...으로 정렬
    */

    currentPage =
      Math.floor(
        currentPage / 2
      ) * 2;


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
   이미지 WebP 자동 변환
========================================================= */

async function convertImageToWebP(
  file,
  {
    quality = 0.85,
    maxWidth = 2200,
    maxHeight = null
  } = {}
) {

  if (!file) {
    throw new Error(
      "변환할 이미지가 없습니다."
    );
  }


  const bitmap =
    await createImageBitmap(
      file
    );


  let width =
    bitmap.width;

  let height =
    bitmap.height;


  let scale =
    1;


  if (
    maxWidth &&
    width > maxWidth
  ) {

    scale =
      Math.min(
        scale,
        maxWidth / width
      );
  }


  if (
    maxHeight &&
    height > maxHeight
  ) {

    scale =
      Math.min(
        scale,
        maxHeight / height
      );
  }


  if (
    scale < 1
  ) {

    width =
      Math.round(
        width * scale
      );

    height =
      Math.round(
        height * scale
      );
  }


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;

  canvas.height =
    height;


  const context =
    canvas.getContext(
      "2d",
      {
        alpha: true
      }
    );


  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );


  bitmap.close();


  const blob =
    await new Promise(
      (
        resolve,
        reject
      ) => {

        canvas.toBlob(
          result => {

            if (!result) {

              reject(
                new Error(
                  "WebP 변환에 실패했습니다."
                )
              );

              return;
            }


            resolve(
              result
            );

          },
          "image/webp",
          quality
        );

      }
    );


  const originalBaseName =
    file.name
      .replace(
        /\.[^.]+$/,
        ""
      );


  return new File(
    [blob],
    `${originalBaseName}.webp`,
    {
      type:
        "image/webp"
    }
  );
}

/* =========================================================
   업로드 실행
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


    setProgress(
      5,
      "표지 업로드 중..."
    );


const convertedThumbnail =
  await convertImageToWebP(
    thumbnail,
    {
      quality: 0.82,
      maxWidth: 1200
    }
  );


const thumbnailPath =
  `works/${workReference.id}/thumbnail/${Date.now()}_thumbnail.webp`;


const thumbnailUrl =
  await uploadFile(
    convertedThumbnail,
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


    await updateDoc(
      workReference,
      {
        thumbnailUrl
      }
    );


    const chapterReference =
      doc(
        collection(
          db,
          "works",
          workReference.id,
          "chapters"
        )
      );


    const imageUrls =
      await uploadChapterImages(
        workReference.id,
        chapterReference.id,
        pageFiles,
        15,
        95
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
   여러 이미지 WebP 변환 + 업로드
========================================================= */

async function uploadChapterImages(
  workId,
  chapterId,
  files,
  startPercent,
  endPercent
) {

  const urls = [];

  const range =
    endPercent - startPercent;

  /*
    같은 회차를 수정할 때
    브라우저/R2 캐시와 파일명 충돌을 피하기 위한 ID
  */
  const batchId =
    Date.now();


  for (
    let i = 0;
    i < files.length;
    i++
  ) {

    const originalFile =
      files[i];


    /* =========================
       1. WebP 변환
    ========================= */

    const convertedFile =
      await convertImageToWebP(
        originalFile,
        {
          quality: 0.85,
          maxWidth: 2200
        }
      );


    console.log(
      `[WebP ${i + 1}/${files.length}]`,
      originalFile.name,
      originalFile.type,
      "→",
      convertedFile.name,
      convertedFile.type
    );


    /* =========================
       2. 파일명 생성
       확장자는 무조건 .webp
    ========================= */

    const number =
      String(i + 1)
        .padStart(
          4,
          "0"
        );


    const filename =
      `${batchId}_${number}.webp`;


    const path =
      `works/${workId}/chapters/${chapterId}/${filename}`;


    /* =========================
       3. 진행률 계산
    ========================= */

    const fileStart =
      startPercent +
      range *
        (i / files.length);


    const fileEnd =
      startPercent +
      range *
        ((i + 1) / files.length);


    /* =========================
       4. 변환된 WebP 업로드
    ========================= */

    const url =
      await uploadFile(
        convertedFile,
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
            `WebP 업로드 중 · ${i + 1} / ${files.length}`
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
   R2 업로드
========================================================= */

async function uploadFile(
  file,
  path,
  onProgress
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const uploadUrl =
        `${R2_CONFIG.workerUrl}/upload?path=${encodeURIComponent(path)}`;


      console.log(
        "R2 업로드 요청:",
        uploadUrl
      );


      const xhr =
        new XMLHttpRequest();


      xhr.open(
        "POST",
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

          console.log(
            "Worker 상태:",
            xhr.status
          );

          console.log(
            "Worker 응답:",
            xhr.responseText
          );


          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {

            reject(
              new Error(
                `R2 업로드 실패 (${xhr.status}): ${xhr.responseText}`
              )
            );

            return;

          }


          try {

            const result =
              JSON.parse(
                xhr.responseText
              );


            if (
              !result.publicUrl
            ) {

              throw new Error(
                "Worker 응답에 publicUrl이 없습니다."
              );

            }


            resolve(
              result.publicUrl
            );


          } catch (
            error
          ) {

            reject(
              new Error(
                `Worker가 올바른 JSON을 반환하지 않았습니다: ${xhr.responseText}`
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
              "Cloudflare Worker 연결에 실패했습니다."
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
   R2 삭제
========================================================= */

function getR2PathFromUrl(
  imageUrl
) {

  if (
    !imageUrl
  ) {
    return null;
  }


  try {

    const url =
      new URL(
        imageUrl
      );


    return url.pathname
      .replace(
        /^\/+/,
        ""
      );


  } catch (
    error
  ) {

    console.error(
      "R2 URL 분석 실패:",
      imageUrl,
      error
    );


    return null;

  }

}


async function deleteR2File(
  imageUrl
) {

  const path =
    getR2PathFromUrl(
      imageUrl
    );


  if (
    !path
  ) {
    return;
  }


  const response =
    await fetch(
      `${R2_CONFIG.workerUrl}/delete?path=${encodeURIComponent(path)}`,
      {
        method:
          "DELETE"
      }
    );


  const responseText =
    await response.text();


  if (
    !response.ok
  ) {

    throw new Error(
      `R2 삭제 실패 (${response.status}): ${responseText}`
    );

  }


  let result =
    null;


  try {

    result =
      JSON.parse(
        responseText
      );

  } catch {

    result = {
      success: true,
      raw: responseText
    };

  }


  console.log(
    "R2 삭제 완료:",
    result
  );

}


/* =========================================================
   작품 삭제
========================================================= */

document
  .getElementById(
    "deleteWorkBtn"
  )
  .addEventListener(
    "click",
    deleteCurrentWork
  );


async function deleteCurrentWork() {

  if (
    !selectedWork
  ) {
    return;
  }


  const title =
    selectedWork.title ||
    "제목 없음";


  const confirmed =
    confirm(
      `"${title}" 작품을 정말 삭제하시겠습니까?\n\n` +
      `표지, 모든 회차 이미지, Firestore 데이터가 함께 삭제됩니다.\n` +
      `이 작업은 되돌릴 수 없습니다.`
    );


  if (
    !confirmed
  ) {
    return;
  }


  try {

    const workId =
      selectedWork.id;


    console.log(
      "작품 삭제 시작:",
      workId
    );


    const chaptersSnapshot =
      await getDocs(
        collection(
          db,
          "works",
          workId,
          "chapters"
        )
      );


    for (
      const chapterDoc
      of chaptersSnapshot.docs
    ) {

      const chapter =
        chapterDoc.data();


      const images =
        chapter.images ||
        [];


      for (
        const imageUrl
        of images
      ) {

        await deleteR2File(
          imageUrl
        );

      }


      await deleteDoc(
        doc(
          db,
          "works",
          workId,
          "chapters",
          chapterDoc.id
        )
      );

    }


    if (
      selectedWork.thumbnailUrl
    ) {

      await deleteR2File(
        selectedWork.thumbnailUrl
      );

    }


    await deleteDoc(
      doc(
        db,
        "works",
        workId
      )
    );


    for (
      let i =
        localStorage.length - 1;
      i >= 0;
      i--
    ) {

      const key =
        localStorage.key(
          i
        );


      if (
        key &&
        key.startsWith(
          `comicViewerProgress:${workId}:`
        )
      ) {

        localStorage.removeItem(
          key
        );

      }

    }


    selectedWork =
      null;

    currentChapters =
      [];


    alert(
      "작품이 삭제되었습니다."
    );


    showLibrary();


  } catch (
    error
  ) {

    console.error(
      "작품 삭제 실패:",
      error
    );


    alert(
      "작품 삭제 중 오류가 발생했습니다.\n\n" +
      error.message
    );

  }

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
    String(
      value
    )
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
        .contains(
          "dark"
        );


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
      .contains(
        "dark"
      )
      ? "☀️"
      : "🌙";

}


/* =========================================================
   기타
========================================================= */

function sortImageFiles(
  fileList
) {

  return Array.from(
    fileList
  ).sort(
    (
      a,
      b
    ) =>
      a.name.localeCompare(
        b.name,
        undefined,
        {
          numeric: true,
          sensitivity:
            "base"
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
    error?.code ||
    "";


  if (
    code.includes(
      "permission-denied"
    ) ||
    code.includes(
      "unauthorized"
    )
  ) {

    return "Firebase 권한이 없습니다. Firestore 보안 규칙을 확인해주세요.";

  }


  return (
    error?.message ||
    "업로드 중 오류가 발생했습니다."
  );

}

console.log("newImageUrls =", newImageUrls);