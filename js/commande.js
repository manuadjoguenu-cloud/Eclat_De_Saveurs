
(function () {
  const listeEl = document.getElementById("liste-commande");
  const lignesEl = document.getElementById("panier-lignes");
  const totalEl = document.getElementById("panier-total");
  const form = document.getElementById("form-commande");
  const champAdresse = document.getElementById("champ-adresse");
  const erreurEl = document.getElementById("erreur-cmd");
  const succesEl = document.getElementById("succes-cmd");

  const ORDRE = ["entrée", "plat", "Fast-food", "dessert", "boisson"];
  const TITRES = { "entrée": "Entrées", plat: "Plats", "Fast-food": "Fast-food", dessert: "Desserts", boisson: "Boissons" };

  let plats = [];
  const panier = new Map(); 

  const fcfa = (n) => n.toLocaleString("fr-FR") + " FCFA";

  function el(tag, classe, texte) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texte !== undefined) e.textContent = texte;
    return e;
  }

  function rang(categorie) {
    const i = ORDRE.indexOf(categorie);
    return i === -1 ? 99 : i;
  }

  // --- Liste des plats à commander ---
  function afficherListe() {
    listeEl.textContent = "";
    const categories = [...new Set(plats.map((p) => p.categorie))].sort((a, b) => rang(a) - rang(b));

    categories.forEach((cat) => {
      listeEl.append(el("h3", "cat", TITRES[cat] || cat));
      plats.forEach((p, i) => {
        if (p.categorie !== cat) return;

        const ligne = el("div", "ligne-plat");
        const img = el("img");
        img.src = p.image.startsWith("/") ? p.image : "images/plats/" + p.image;
        img.alt = p.nom;
        img.loading = "lazy";

        const info = el("div", "ligne-info");
        info.append(el("strong", null, p.nom), el("span", null, p.description), el("span", "prix", fcfa(p.prix)));

        const bouton = el("button", "btn-ajout", "Ajouter");
        bouton.type = "button";
        bouton.addEventListener("click", () => changer(i, 1));

        ligne.append(img, info, bouton);
        listeEl.append(ligne);
      });
    });
  }

  // --- Panier ---
  function changer(i, delta) {
    succesEl.textContent = ""; // efface l'ancien message de confirmation
    const q = (panier.get(i) || 0) + delta;
    if (q <= 0) panier.delete(i);
    else panier.set(i, Math.min(q, 100));
    afficherPanier();
  }

  function total() {
    let t = 0;
    for (const [i, q] of panier) t += plats[i].prix * q;
    return t;
  }

  function afficherPanier() {
    lignesEl.textContent = "";
    if (panier.size === 0) lignesEl.append(el("li", "vide", "Votre panier est vide."));

    for (const [i, q] of panier) {
      const p = plats[i];
      const li = el("li", "ligne-panier");

      const moins = el("button", "qte", "−");
      moins.type = "button";
      moins.setAttribute("aria-label", "Retirer un " + p.nom);
      moins.addEventListener("click", () => changer(i, -1));

      const plus = el("button", "qte", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Ajouter un " + p.nom);
      plus.addEventListener("click", () => changer(i, 1));

      li.append(el("span", null, p.nom), moins, el("span", "nb", String(q)), plus, el("span", "sous-total", fcfa(p.prix * q)));
      lignesEl.append(li);
    }
    totalEl.textContent = fcfa(total());
  }

  // --- Adresse : visible seulement pour la livraison ---
  function majAdresse() {
    champAdresse.hidden = form.elements["mode"].value !== "livraison";
  }
  form.addEventListener("change", (e) => {
    if (e.target.name === "mode") majAdresse();
  });

  // --- Envoi ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    erreurEl.textContent = "";
    succesEl.textContent = "";

    const d = Object.fromEntries(new FormData(form));
    const livraison = d.mode === "livraison";

    let erreur = "";
    if (panier.size === 0) erreur = "Ajoute au moins un plat à ta commande.";
    else if (d.nom.trim().length < 4) erreur = "Indique ton nom.";
    else if (d.tel.replace(/\D/g, "").length < 8) erreur = "Indique un numéro de téléphone valide.";
    else if (livraison && d.adresse.trim().length < 5) erreur = "Indique l'adresse de livraison (quartier, point de repère).";

    if (erreur) {
      erreurEl.textContent = erreur;
      return;
    }

    const detail = [...panier]
      .map(([i, q]) => `${q} x ${plats[i].nom} : ${fcfa(plats[i].prix * q)}`)
      .join("\n");

    const message =
      "Bonjour, je souhaite passer une commande à L'Éclat de Saveurs.\n\n" +
      detail + "\n\n" +
      `Total : ${fcfa(total())}` + (livraison ? " (hors frais de livraison)" : "") + "\n" +
      `Mode : ${livraison ? "Livraison" : "Sur place"}\n` +
      (livraison ? `Adresse : ${d.adresse.trim()}\n` : "") +
      `Heure souhaitée : ${d.heure || "dès que possible"}\n` +
      `Nom : ${d.nom.trim()}\n` +
      `Téléphone : ${d.tel.trim()}` +
      (d.note.trim() ? `\nRemarque : ${d.note.trim()}` : "");

    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");

    succesEl.textContent = "Votre commande est prête ! Appuyez sur le bouton « Envoyer » dans WhatsApp pour la valider.";
    panier.clear();
    form.reset();
    majAdresse();
    afficherPanier();
  });

  // --- Chargement du menu ---
  fetch("data/menu.json")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((donnees) => {
      plats = donnees.plats.filter((p) => p.prix); // seuls les plats avec un prix sont commandables
      afficherListe();
      afficherPanier();
      majAdresse();
    })
    .catch((err) => {
      console.error(err);
      listeEl.textContent = "La carte est momentanément indisponible. Contactez-nous sur WhatsApp pour commander.";
    });
})();
