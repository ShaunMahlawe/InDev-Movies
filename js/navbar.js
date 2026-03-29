function initNavbarProfileMenus() {
	const profileMenus = Array.from(document.querySelectorAll(".profile-menu"));

	if (profileMenus.length === 0) {
		return;
	}

	if (document.body.dataset.profileMenuReady === "true") {
		return;
	}
	document.body.dataset.profileMenuReady = "true";

	function closeAllProfileMenus() {
		profileMenus.forEach((menu) => {
			menu.classList.remove("is-open");
			const badge = menu.querySelector(".profile-badge");
			if (badge) {
				badge.setAttribute("aria-expanded", "false");
			}
		});
	}

	profileMenus.forEach((menu) => {
		const badge = menu.querySelector(".profile-badge");
		const dropdownLinks = menu.querySelectorAll(".profile-dropdown a");

		if (!badge) {
			return;
		}

		badge.setAttribute("aria-haspopup", "menu");
		badge.setAttribute("aria-expanded", "false");

		badge.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const nextIsOpen = !menu.classList.contains("is-open");
			closeAllProfileMenus();
			if (nextIsOpen) {
				menu.classList.add("is-open");
				badge.setAttribute("aria-expanded", "true");
			}
		});

		dropdownLinks.forEach((link) => {
			link.addEventListener("click", () => {
				closeAllProfileMenus();
			});
		});
	});

	document.addEventListener("click", (event) => {
		const clickedInsideMenu = profileMenus.some((menu) => menu.contains(event.target));
		if (!clickedInsideMenu) {
			closeAllProfileMenus();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeAllProfileMenus();
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initNavbarProfileMenus);
} else {
	initNavbarProfileMenus();
}
