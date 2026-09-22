document.addEventListener('DOMContentLoaded', function () {
  var langButtons = document.querySelectorAll('.lang-btn');

  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-set-lang');

      if (lang === 'zh') {
        document.documentElement.setAttribute('lang', 'zh-Hant');
      } else {
        document.documentElement.setAttribute('lang', 'en');
      }

      langButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    });
  });
});
// 專案卡片：點擊展開 / 收起
document.addEventListener('DOMContentLoaded', function () {
  var covers = document.querySelectorAll('.project-cover');

  covers.forEach(function (cover) {
    cover.addEventListener('click', function () {
      var card = cover.closest('.project-card');
      if (card) {
        card.classList.toggle('is-open');
      }
    });
  });
});