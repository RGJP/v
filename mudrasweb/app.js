"use strict";

const byId = (id) => document.getElementById(id);
const deck = cartes;
const die = byId("de");
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let current = -1;
let transition;

function render(index, announce) {
  current = index;
  const card = deck[index];
  byId("nom").textContent = card.nom;
  byId("theme").textContent = card.theme;
  byId("theme").classList.toggle("long", card.theme.length > 22);
  byId("devise").textContent = card.devise;
  const photo = byId("geste");
  photo.src = `photos/${String(index).padStart(2, "0")}.webp`;
  photo.alt = `Position des mains — ${card.nom}`;

  byId("sous-titre").textContent = card.sousTitre;
  byId("sous-titre").hidden = !card.sousTitre;
  const paragraphs = card.texte.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  });
  byId("signification").replaceChildren(...paragraphs);
  byId("affirmation").textContent = card.affirmation;
  byId("affirmation").hidden = !card.affirmation;

  for (const tile of byId("grille").children) {
    tile.firstElementChild.toggleAttribute("aria-current", Number(tile.dataset.index) === index);
  }

  if (announce) byId("annonce").textContent = `${card.theme}. ${card.nom}. ${card.devise}.`;
}

function randomIndex() {
  // Give each of the other cards the same chance on a roll.
  const options = current < 0 ? deck.length : deck.length - 1;
  const draw = Math.floor(Math.random() * options);
  return current >= 0 && draw >= current ? draw + 1 : draw;
}

function indexFromHash() {
  const n = Number(location.hash.slice(1));
  if (!n) return -1;
  return deck.findIndex((card) => card.numero === n);
}

function roll() {
  render(randomIndex(), true);
  history.replaceState(null, "", location.pathname + location.search);
  if (prefersReducedMotion.matches) return;

  transition?.cancel();
  transition = document.querySelector(".card").animate(
    [{ opacity: 0.3, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 380, easing: "cubic-bezier(.2,.7,.3,1)" }
  );
  die.firstElementChild.animate(
    [{ transform: "rotate(-15deg)" }, { transform: "rotate(75deg)" }],
    { duration: 300, easing: "ease-out" }
  );
}

die.addEventListener("click", roll);

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest("button, a, input, textarea")) return;
  if (event.key === " " || event.key === "ArrowRight") {
    event.preventDefault();
    roll();
  }
});

addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) render(index, true);
});

function buildGallery() {
  const tiles = deck.map((card, index) => {
    const item = document.createElement("li");
    item.dataset.index = index;
    const button = document.createElement("button");
    button.type = "button";
    button.title = `${card.theme} — ${card.nom}`;
    const img = document.createElement("img");
    img.src = `photos/mini/${String(index).padStart(2, "0")}.webp`;
    img.alt = `${card.theme} — ${card.nom}`;
    img.loading = "lazy";
    img.decoding = "async";
    const caption = document.createElement("span");
    caption.className = "legende";
    const theme = document.createElement("strong");
    theme.textContent = card.theme;
    const nom = document.createElement("small");
    nom.textContent = card.nom;
    caption.append(theme, nom);
    img.alt = "";
    button.append(img, caption);
    button.addEventListener("click", () => {
      render(index, true);
      if (card.numero) history.replaceState(null, "", `#${card.numero}`);
      scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
      die.focus({ preventScroll: true });
    });
    item.append(button);
    return item;
  });
  byId("grille").replaceChildren(...tiles);
}

buildGallery();
function hashText(text, seed = 7) {
  let a = 0xdeadbeef ^ seed, b = 0x41c6ce57 ^ seed;
  for (const char of text) {
    const k = char.codePointAt(0);
    a = Math.imul(a ^ k, 2654435761);
    b = Math.imul(b ^ k, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}

const ACCESS = "9w98pmoj7c";
byId("porte").addEventListener("submit", (event) => {
  event.preventDefault();
  const field = byId("mdp");
  if (hashText(field.value.trim()) === ACCESS) {
    try { localStorage.setItem("mudras-acces", ACCESS); } catch {}
    document.documentElement.classList.add("ouvert");
    field.value = "";
  } else {
    byId("porte-erreur").textContent = "Mot de passe incorrect";
    field.select();
  }
});

const fromHash = indexFromHash();
render(fromHash >= 0 ? fromHash : randomIndex(), false);
byId("tirage").hidden = false;
