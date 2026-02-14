// ----------- Vùng chức năng -------------
// 🧩 1️⃣ Include HTML Components
function includeHTML(callback) {
  const elements = document.querySelectorAll("[data-include]");
  if (!elements.length) {
    if (callback) callback();
    return;
  }

  let loaded = 0;

  Promise.all([...elements].map(async (el) => {
    const file = el.getAttribute("data-include");
    if (!file) return;

    const cacheKey = `comp-${file}`;
    let html = sessionStorage.getItem(cacheKey);

    if (!html) {
      const res = await fetch(`${file}?v=${Date.now()}`, { cache: "no-store" });
      html = await res.text();
      sessionStorage.setItem(cacheKey, html);
    }

    el.innerHTML = html;
    if (typeof initResponsive === "function") initResponsive(el);

    if (++loaded === elements.length) {
      document.dispatchEvent(new Event("includesLoaded"));
      if (callback) callback();
    }
  }));
}

// js thêm active
function initToggleSystem(configs = []) {
  if (!window._toggleSystemState) {
    window._toggleSystemState = { docKeys: new Set(), keyKeys: new Set() };
  }
  const state = window._toggleSystemState;

  configs.forEach((cfg, cfgIndex) => {
    if (!cfg || !cfg.trigger) return;

    const activeClass = cfg.activeClass || "active";
    const behavior = cfg.behavior || "toggle";
    const closeOnOutside = !!cfg.closeOnOutside;
    const closeOnEsc = !!cfg.closeOnEsc;
    const overlayCloses = !!cfg.overlayCloses;
    const innerSelector = cfg.innerSelector || null;
    const closeBtnSelector = cfg.closeBtn || null;
    const groupSelector = cfg.groupSelector || null;

    const triggers = Array.from(document.querySelectorAll(cfg.trigger));
    if (!triggers.length) return;

    const targets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];

    const closeAll = () => {
      targets.forEach(t => t.classList.remove(activeClass));
      triggers.forEach(t => t.classList.remove(activeClass));
    };

    // bind sự kiện click cho từng trigger (chỉ bind 1 lần)
    triggers.forEach((trigger, idx) => {
      if (trigger.dataset._toggleBound === "true") return;
      trigger.dataset._toggleBound = "true";

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();

        // Tìm target element ứng với trigger (nếu có)
        let targetEl = null;
        if (cfg.target) {
          if (trigger.dataset && trigger.dataset.target) {
            targetEl = document.querySelector(trigger.dataset.target);
          } else {
            targetEl = targets[idx] || targets[0] || null;
          }
        }

        // ---- behavior activate (tab-like) ----
        if (behavior === "activate") {
          if (groupSelector) {
            document.querySelectorAll(groupSelector).forEach(el => el.classList.remove(activeClass));
          } else {
            triggers.forEach(t => t.classList.remove(activeClass));
          }
          trigger.classList.add(activeClass);

          if (targets.length > 0 && targetEl) {
            targets.forEach(t => t.classList.remove(activeClass));
            targetEl.classList.add(activeClass);
          }
        }

        // ---- toggle mode ----
        else {
          if (targetEl) targetEl.classList.toggle(activeClass);
          else trigger.classList.toggle(activeClass);
        }

        // callback onToggle (nếu có)
        if (typeof cfg.onToggle === "function") {
          try { cfg.onToggle(trigger, idx); } catch (err) { /* ignore */ }
        }

        // -> GỌI onActiveChange bất kể có target hay không
        if (typeof cfg.onActiveChange === "function") {
          const isActive = targetEl ? targetEl.classList.contains(activeClass) : trigger.classList.contains(activeClass);
          try { cfg.onActiveChange(isActive, trigger, targetEl, idx); } catch (err) { /* ignore */ }
        }
      });
    });

    // bind nút đóng (nhiều selector)
    if (closeBtnSelector) {
      Array.from(document.querySelectorAll(closeBtnSelector)).forEach(btn => {
        if (btn.dataset._toggleCloseBound === "true") return;
        btn.dataset._toggleCloseBound = "true";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeAll();
        });
      });
    }

    // click outside để đóng
    if (closeOnOutside) {
      const docKey = `doc_${cfg.trigger}|${cfg.target || ""}|${cfgIndex}`;
      if (!state.docKeys.has(docKey)) {
        state.docKeys.add(docKey);
        document.addEventListener("click", (e) => {
          const currTriggers = Array.from(document.querySelectorAll(cfg.trigger));
          const currTargets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];

          const clickedOnTrigger = currTriggers.some(t => t.contains(e.target));
          const clickedOnOverlay = overlayCloses && currTargets.some(t => e.target === t);

          const clickedInsideTarget = currTargets.some(t => {
            const inner = innerSelector ? t.querySelector(innerSelector) : t;
            return inner && inner.contains(e.target);
          });

          if (clickedOnOverlay) {
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
            return;
          }

          if (!clickedInsideTarget && !clickedOnTrigger) {
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
          }
        });
      }
    }

    // ESC để đóng
    if (closeOnEsc) {
      const escKey = `esc_${cfg.trigger}|${cfg.target || ""}|${cfgIndex}`;
      if (!state.keyKeys.has(escKey)) {
        state.keyKeys.add(escKey);
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            const currTargets = cfg.target ? Array.from(document.querySelectorAll(cfg.target)) : [];
            const currTriggers = Array.from(document.querySelectorAll(cfg.trigger));
            currTargets.forEach(t => t.classList.remove(activeClass));
            currTriggers.forEach(t => t.classList.remove(activeClass));
          }
        });
      }
    }

    // === gọi onActiveChange cho trạng thái ban đầu (nếu có active sẵn trong DOM) ===
    if (typeof cfg.onActiveChange === "function") {
      // delay một tick để đảm bảo các class có sẵn đã gán xong (nếu include động)
      setTimeout(() => {
        Array.from(document.querySelectorAll(cfg.trigger)).forEach((tr, i) => {
          const targetEl = cfg.target ? (document.querySelectorAll(cfg.target)[i] || document.querySelectorAll(cfg.target)[0]) : null;
          const isActive = targetEl ? targetEl.classList.contains(activeClass) : tr.classList.contains(activeClass);
          if (isActive) {
            try { cfg.onActiveChange(true, tr, targetEl, i); } catch (err) { }
          }
        });
      }, 0);
    }
  });
}

// 🖼️ 2️⃣ Lazy Load + Set Dimensions
function applyImageEnhancements(root = document) {
  root.querySelectorAll("img").forEach(img => {
    // Lazy load
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");

    // Alt text
    if (!img.hasAttribute("alt") || img.alt.trim() === "") {
      const fileName = img.src.split("/").pop().split(".")[0] || "image";
      img.setAttribute("alt", fileName.replace(/[-_]/g, " "));
    }

    // Hàm set kích thước an toàn
    const setDim = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        if (!img.hasAttribute("width")) img.setAttribute("width", img.naturalWidth);
        if (!img.hasAttribute("height")) img.setAttribute("height", img.naturalHeight);
      }
    };

    // Nếu ảnh đã load sẵn (cache hoặc render sớm)
    if (img.complete) setTimeout(setDim, 50);
    else img.addEventListener("load", setDim);

    // Chỉ xử lý khi xuất hiện trong viewport
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setDim();
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "200px 0px" });
    io.observe(img);
  });
}

// ✨ 3️⃣ Scroll Reveal Effect
function initRevealEffect() {
  const sections = document.querySelectorAll("section, footer");
  if (!sections.length) return;

  sections.forEach(sec => sec.classList.add("hidden-section"));

  let revealIndex = 0;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.transitionDelay = `${revealIndex * 20}ms`;
        revealIndex++;
        el.classList.add("show-up");
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -10% 0px" });

  sections.forEach(sec => observer.observe(sec));
}

// 🧩 1️⃣ Hàm dùng chung cho tất cả slick
function initSlickSlider({
  mainSelector,
  navSelector = null,
  minSlides = 0,
  mainOptions = {},
  navOptions = {},
  prevBtnSelector = null,
  nextBtnSelector = null
}) {
  const $main = $(mainSelector);
  if (!$main.length) return;

  // --- Helper: clone thêm slide nếu ít hơn minSlides ---
  const ensureMinSlides = ($el, minCount) => {
    const $items = $el.children();
    let count = $items.length;
    let i = 0;
    while (count < minCount) {
      $el.append($items.eq(i % $items.length).clone());
      count++;
      i++;
    }
  };

  // --- Có nav → slider kép ---
  if (navSelector) {
    const $nav = $(navSelector);
    if (!$nav.length) return;

    if (minSlides > 0) ensureMinSlides($nav, minSlides);

    if (!$main.hasClass("slick-initialized")) {
      $main.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        infinite: true,
        arrows: false,
        asNavFor: navSelector,
        ...mainOptions
      });
    }

    if (!$nav.hasClass("slick-initialized")) {
      $nav.slick({
        slidesToShow: 8,
        slidesToScroll: 1,
        focusOnSelect: true,
        infinite: true,
        arrows: false,
        centerMode: true,
        centerPadding: "0px",
        asNavFor: mainSelector,
        ...navOptions
      });
    }

    // --- Nút prev/next riêng (nếu có) ---
    if (prevBtnSelector) {
      const prevBtn = document.querySelector(prevBtnSelector);
      if (prevBtn) prevBtn.addEventListener("click", () => $main.slick("slickPrev"));
    }

    if (nextBtnSelector) {
      const nextBtn = document.querySelector(nextBtnSelector);
      if (nextBtn) nextBtn.addEventListener("click", () => $main.slick("slickNext"));
    }
  }

  // --- Không có nav → slider đơn ---
  else {
    if (minSlides > 0) ensureMinSlides($main, minSlides);

    if (!$main.hasClass("slick-initialized")) {
      $main.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        infinite: true,
        ...mainOptions
      });
    }

    if (prevBtnSelector) {
      const prevBtn = document.querySelector(prevBtnSelector);
      if (prevBtn) prevBtn.addEventListener("click", () => $main.slick("slickPrev"));
    }

    if (nextBtnSelector) {
      const nextBtn = document.querySelector(nextBtnSelector);
      if (nextBtn) nextBtn.addEventListener("click", () => $main.slick("slickNext"));
    }
  }
}

// js chức năng bấm hình sản phẩm
function initProductGallery({
  containerSelector,
  mainSelector,
  thumbSelector
}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const mainImage = container.querySelector(mainSelector);
  const thumbItems = container.querySelectorAll(thumbSelector);
  const prevBtn = container.querySelector("button:first-child");
  const nextBtn = container.querySelector("button:last-child");

  if (!mainImage || !thumbItems.length) return;

  let currentIndex = 0;

  // Đổi ảnh chính
  const showImage = (index) => {
    currentIndex = index;
    mainImage.src = thumbItems[currentIndex].src;
  };

  // Click thumbnail
  thumbItems.forEach((img, index) => {
    img.addEventListener("click", () => showImage(index));
  });

  // Nút prev / next
  prevBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + thumbItems.length) % thumbItems.length;
    showImage(currentIndex);
  });

  nextBtn?.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % thumbItems.length;
    showImage(currentIndex);
  });
}

// chức năng swiper ở mục tab và sản phẩm trang chủ
function enableHorizontalSwipe(selector, speed = 1) {
  const container = document.querySelector(selector);
  if (!container) return;

  let isDown = false;
  let startX, scrollLeft;

  const startDrag = e => {
    isDown = true;
    container.classList.add("grabbing");
    startX = e.pageX || e.touches[0].pageX;
    scrollLeft = container.scrollLeft;
  };

  const moveDrag = e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX || e.touches[0].pageX;
    const walk = (x - startX) * speed;
    container.scrollLeft = scrollLeft - walk;
  };

  const endDrag = () => {
    isDown = false;
    container.classList.remove("grabbing");
  };

  // Gán event cho cả chuột & cảm ứng
  container.addEventListener("mousedown", startDrag);
  container.addEventListener("touchstart", startDrag);
  container.addEventListener("mousemove", moveDrag);
  container.addEventListener("touchmove", moveDrag);
  container.addEventListener("mouseup", endDrag);
  container.addEventListener("mouseleave", endDrag);
  container.addEventListener("touchend", endDrag);
}

// chức năng đổi tên và gán link vào a và đạc biệt thêm thẻ li a vào mục lục bài viét
function generateHeadingLinks({
  contentSelector,
  outputSelector = null,
  linkSelector = null,
  toggleSelector = null
}) {
  const content = document.querySelector(contentSelector);
  if (!content) return;

  const headings = content.querySelectorAll("h1, h2, h3, h4, h5, h6");
  if (!headings.length) return;

  const toSlug = str => str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .toLowerCase();

  headings.forEach((h, i) => {
    const text = h.textContent.trim();
    const id = toSlug(text) || `heading-${i}`;
    h.id = id;
  });

  if (outputSelector) {
    const tocBody = document.querySelector(outputSelector);
    if (tocBody) {
      tocBody.innerHTML = "";
      headings.forEach(h => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${h.id}`;
        a.textContent = h.textContent.trim();
        li.appendChild(a);
        tocBody.appendChild(li);
      });
    }


    if (toggleSelector && tocBody) {
      const toggle = document.querySelector(toggleSelector);
      toggle.addEventListener("click", e => {
        e.stopPropagation();
        tocBody.classList.toggle("open");
      });
      document.addEventListener("click", e => {
        if (!e.target.closest(toggleSelector)) tocBody.classList.remove("open");
      });
    }
  }


  if (linkSelector) {
    const links = document.querySelectorAll(linkSelector);
    const count = Math.min(headings.length, links.length);
    for (let i = 0; i < count; i++) {
      const heading = headings[i];
      const link = links[i];
      link.setAttribute("href", `#${heading.id}`);
      link.addEventListener("click", e => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
}
// js bật tắt menu
function toggleMenu(buttonSelector, menuSelector) {
  const button = document.querySelector(buttonSelector);
  const menu = document.querySelector(menuSelector);

  if (!button || !menu) return;

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !button.contains(e.target)) {
      menu.classList.remove('active');
    }
  });
}

// js roll to top
function initScrollToTop(btnId = "btnToTop", showOffset = 1000) {
  const scrollBtn = document.getElementById(btnId);
  if (!scrollBtn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > showOffset) {
      scrollBtn.classList.add("show");
    } else {
      scrollBtn.classList.remove("show");
    }
  });

  scrollBtn.addEventListener("click", () => {
    window.scroll({
      top: 0,
      behavior: "smooth",
    });
  });
}

// js menu con 
function initMobileMenuSimple() {

  // ===== LEVEL 1 =====
  document.querySelectorAll(".m-menu__link").forEach(link => {
    link.addEventListener("click", function (e) {
      const currentItem = this.closest(".m-menu__item");
      if (!currentItem) return;

      e.preventDefault();

      // tắt tất cả item khác
      document.querySelectorAll(".m-menu__item.is-active").forEach(item => {
        if (item !== currentItem) {
          item.classList.remove("is-active");
        }
      });

      // toggle item hiện tại
      currentItem.classList.toggle("is-active");
    });
  });

  // ===== LEVEL 2 =====
  document.querySelectorAll(".m-submenu__item > a").forEach(link => {
    link.addEventListener("click", function (e) {
      const currentItem = this.closest(".m-submenu__item");
      if (!currentItem) return;

      e.preventDefault();

      // tắt mấy thằng cùng level
      const siblings = currentItem
        .closest(".m-submenu")
        .querySelectorAll(".m-submenu__item.is-active");

      siblings.forEach(item => {
        if (item !== currentItem) {
          item.classList.remove("is-active");
        }
      });

      currentItem.classList.toggle("is-active");
    });
  });

}

// js chạy thanh bar ở trang giới thiệu
function runCoreProgress() {
  document.querySelectorAll(".progress-bar").forEach(bar => {
    const percent = bar.dataset.percent || 0;

    bar.style.transition = "none";
    bar.style.width = "0";

    requestAnimationFrame(() => {
      bar.style.transition = "width 1.2s ease";
      bar.style.width = percent + "%";
    });
  });
}
// js phần table trong email
function initTechBoxToggle({
  techBoxSelector = ".tech-box",
  tableSelector = ".table-scroll",
  activeClass = "active",
} = {}) {
  const techBoxes = document.querySelectorAll(techBoxSelector);
  const tables = document.querySelectorAll(tableSelector);

  if (!techBoxes.length || !tables.length) return;

  techBoxes.forEach((box, index) => {
    if (box.dataset._techBound === "true") return;
    box.dataset._techBound = "true";

    box.addEventListener("click", () => {
      techBoxes.forEach(b => b.classList.remove(activeClass));
      tables.forEach(t => t.classList.remove(activeClass));

      box.classList.add(activeClass);
      if (tables[index]) {
        tables[index].classList.add(activeClass);
      }
    });
  });
}

// js validate form
function validateField(input) {
  const group = input.closest(".form-group");
  const error = group?.querySelector(".error-msg");
  let message = "";

  const value = input.value.trim();

  if (input.hasAttribute("required") && !value) {
    message = input.dataset.msg || "Vui lòng không để trống";
  }

  if (!message && input.type === "email" && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) message = "Email không hợp lệ";
  }

  if (!message && input.hasAttribute("minlength")) {
    const min = +input.getAttribute("minlength");
    if (value.length < min) {
      message = input.dataset.msg || `Tối thiểu ${min} ký tự`;
    }
  }

  if (!message && input.tagName === "SELECT" && input.required) {
    if (!input.value) message = "Vui lòng chọn một giá trị";
  }

  if (!message && input.type === "checkbox" && input.required) {
    if (!input.checked) message = "Vui lòng xác nhận";
  }

  if (!message && input.pattern && input.value) {
    const regex = new RegExp(input.pattern);
    if (!regex.test(input.value)) {
      message = input.dataset.msg || "Giá trị không hợp lệ";
    }
  }

  if (group) group.classList.toggle("error", !!message);
  if (error) error.textContent = message;

  return !message;
}

function validateForm(form) {
  let isValid = true;
  form.querySelectorAll("input, textarea").forEach(input => {
    if (!validateField(input)) isValid = false;
  });
  return isValid;
}

function initFormValidation(root = document) {
  root.querySelectorAll(".js-validate-form").forEach(form => {
    if (form.dataset._validated) return;
    form.dataset._validated = "true";

    form.querySelectorAll("input, textarea").forEach(input => {
      input.addEventListener("input", () => validateField(input));
    });

    form.addEventListener("submit", e => {
      if (!validateForm(form)) e.preventDefault();
    });
  });
}

// ----------- Vùng gọi biến --------------
document.addEventListener("DOMContentLoaded", () => {
  includeHTML(() => {

    // 📚 1️⃣ MỤC LỤC & MENU LIÊN KẾT
    generateHeadingLinks({
      contentSelector: ".blog-content",
      outputSelector: ".table-heading__body ul",
      toggleSelector: ".table-heading__top"
    });

    generateHeadingLinks({
      contentSelector: "#intro-content",
      linkSelector: ".menu-shortcut__container .intro-banner__shortcut"
    });

    // 🧭 2️⃣ SWIPE NGANG / DRAG TAB
    enableHorizontalSwipe(".product-container", 1);
    enableHorizontalSwipe(".product-container__mb", 1.2);

    // 🎞️ 3️⃣ SLICK SLIDER CÁC PHẦN

    // 🟢 Slide banner chính
    initSlickSlider({
      mainSelector: '.slide-container',
      minSlides: 3,
      mainOptions: {
        infinite: true,
        autoplay: true,
        dots: true,
        arrows: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: false,
        appendDots: $('.custom-dots')
      }
    });

    // 🟣 Feedback slide
    initSlickSlider({
      mainSelector: '.feedback-item__container',
      mainOptions: {
        infinite: true,
        autoplay: true,
        dots: false,
        arrows: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: false
      }
    });

    // 🟡 Intro slide chạy ngang
    initSlickSlider({
      mainSelector: '.intro-slide',
      minSlides: 6,
      mainOptions: {
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 0,
        speed: 4000,
        cssEase: 'linear',
        arrows: false,
        dots: false,
        infinite: true,
        pauseOnHover: false,
        pauseOnFocus: false,
        variableWidth: true
      }
    });

    // 🟡 roll to the top
    initScrollToTop();

    // 🔵 Popup gallery (for–nav)
    initSlickSlider({
      mainSelector: ".gallery-slider-for",
      navSelector: ".gallery-slider-nav",
      popupSelector: ".gallery-section",
      triggerSelector: ".intro-slide__img img, .intro-slide__folderImage img",
      closeBtnSelector: ".gallery-section .btn-close",
      prevBtnSelector: ".gallery-section .btn-prev",
      nextBtnSelector: ".gallery-section .btn-next",
      minSlides: 9,
      mainOptions: {
        speed: 500
      },
      navOptions: {
        variableWidth: true
      }
    });

    // gallery hình ảnh sản phẩm
    initProductGallery({
      containerSelector: ".product-container__image",
      mainSelector: ".product-image > img",
      thumbSelector: ".product-image__item img"
    });
    // ✨ 4️⃣ HIỆU ỨNG ẢNH & REVEAL
    applyImageEnhancements();
    initRevealEffect();

    // THỰC THI ADD ACTIVE VÀO VÙNG CẦN
    initToggleSystem([
      {
        trigger: ".btn-submit-review",
        target: "#popupReview",
        closeBtn: "#popupReview .btn-close, #popupReview .popup-close",
        closeOnOutside: true,
        closeOnEsc: true,
        behavior: "toggle"
      },
      {
        trigger: ".js-faq-trigger",
        target: ".js-faq-target",
        activeClass: "active",
        behavior: "activate",
        closeOnOutside: true,
        onActiveChange: function (isActive, trigger, target) {
          // nếu đang active mà bấm lại chính nó → đóng
          if (isActive && trigger._justClicked) {
            trigger.classList.remove("active");
            target && target.classList.remove("active");
          }

          trigger._justClicked = true;
          setTimeout(() => trigger._justClicked = false, 0);
        }
      }
    ]);
    // thực thi bật tắt menu
    toggleMenu('.menu-container__bar', '.m-menu');
    initMobileMenuSimple();
    runCoreProgress();
    initTechBoxToggle();
    initFormValidation();
  });
});

// 🔁 Cập nhật khi include hoặc slick load lại
document.addEventListener("includesLoaded", () => applyImageEnhancements());
$(document).on("init reInit afterChange", ".slick-slider", function () {
  applyImageEnhancements(this);
});
