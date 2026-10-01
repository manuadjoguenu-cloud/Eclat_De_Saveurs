// Menu mobile 
const burger = document.getElementById("burger");
const liens = document.getElementById("liens");
burger.addEventListener("click", () => liens.classList.toggle("ouvert"));
liens.addEventListener("click", () => liens.classList.remove("ouvert"));

// Carte : chargement de data/menu.json 
const grille = document.getElementById("grille");

function formaterPrix(prix) {
  return prix.toLocaleString("fr-FR") + " FCFA";
}

function creerCarte(plat) {
  const carte = document.createElement("article");
  carte.className = "card";
  carte.innerHTML = `
    <img src="images/plats/${plat.image}" alt="${plat.nom}">
    <div>
      <h3>${plat.nom}</h3>
      <p>${plat.description}</p>
      ${plat.prix ? `<span class="prix">${formaterPrix(plat.prix)}</span>` : ""}
    </div>`;
  return carte;
}

async function chargerMenu() {
  try {
    const reponse = await fetch("data/menu.json");
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    const donnees = await reponse.json();

    grille.innerHTML = "";
    donnees.plats
      .filter((plat) => plat.signature)
      .forEach((plat) => grille.appendChild(creerCarte(plat)));
  } catch (erreur) {
    console.error(erreur);
    grille.innerHTML =
      '<p class="message">Impossible de charger la carte. Ouvre le site avec Live Server (et non en double-cliquant sur le fichier).</p>';
  }
}

chargerMenu();