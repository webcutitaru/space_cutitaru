export type SectionKind =
  | "announcement"
  | "ticker"
  | "icons"
  | "divider"
  | "stars"
  | "bullets"
  | "slider"
  | "bundle"
  | "delivery"
  | "badges"
  | "upsell"
  | "tabs"
  | "faq"
  | "testimonials"
  | "cart";

export type ThemeSection = {
  id: string;
  name: string;
  use: string;
  note?: string;
  kind: SectionKind;
};

export type ThemeGroup = {
  id: string;
  title: string;
  lead: string;
  sections: ThemeSection[];
};

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: "chrome",
    title: "Deasupra paginii",
    lead: "Le vezi înainte de produs: banda de sus, fâșia care alunecă, rândul de iconițe și linia dintre secțiuni.",
    sections: [
      {
        id: "announcement",
        name: "Announcement Pro",
        use: "Banda de deasupra header-ului. Poate arăta un cronometru, un mesaj de livrare și o ofertă. Pe telefon le rotește la câteva secunde. Culorile goale urmează paleta temei. Link-urile sunt opționale.",
        note: "Nu ține stoc rezervat și nu aplică reducerea scrisă în text.",
        kind: "announcement",
      },
      {
        id: "ticker",
        name: "Horizontal Ticker Pro",
        use: "O fâșie de texte care alunecă. Fiecare bloc Text e o frază. O folosești pentru „livrare rapidă” sau „retur 30 de zile”.",
        note: "Nu are legătură cu coșul.",
        kind: "ticker",
      },
      {
        id: "icons",
        name: "Icon Bar Pro",
        use: "Un rând de iconițe cu titlu scurt: livrare, retur, plată. Poate fi grilă sau slider. Pe produs și pe acasă e deja pusă.",
        note: "Autoplay mișcă iconițele, nu videoclipuri.",
        kind: "icons",
      },
      {
        id: "divider",
        name: "Section Divider Pro",
        use: "O linie sau o formă între secțiuni. În temă stă deasupra footer-ului.",
        note: "Doar decor.",
        kind: "divider",
      },
    ],
  },
  {
    id: "product",
    title: "Pe pagina de produs",
    lead: "De la titlu în jos, în ordinea în care le întâlnește cumpărătorul.",
    sections: [
      {
        id: "stars",
        name: "Star Rating Pro",
        use: "Steluțe lângă titlul produsului. Nota și numărul de review-uri le scrii tu.",
        note: "Nu citește aplicația de review-uri.",
        kind: "stars",
      },
      {
        id: "bullets",
        name: "Bullet Points Pro",
        use: "Lista scurtă de beneficii de sub titlu. Fiecare punct are text și, opțional, o iconiță.",
        kind: "bullets",
      },
      {
        id: "slider",
        name: "Image/Video Slider Pro",
        use: "Carusel de poze sau video. Fiecare slide are media și, opțional, un link.",
        note: "Autoplay-ul caruselului e oprit în temă. Un video pornește doar când slide-ul lui e pe ecran.",
        kind: "slider",
      },
      {
        id: "bundle",
        name: "Bundle Save",
        use: "Înlocuiește „câte bucăți” cu opțiuni (1, 2, 3…). Cantitatea din opțiunea bifată se scrie în formular. Dacă toate bucățile sunt aceeași variantă, butonul normal de add to cart le pune în coș. Dacă alegi variante diferite pentru fiecare bucată, le adaugă scriptul.",
        note: "Procentul sau suma afișată nu e o reducere Shopify. Cadourile de dedesubt sunt doar afișate. Poți seta Enable, opțiunea preselectată, cantitatea, eticheta, selectorul de variante și ascunderea cantității clasice.",
        kind: "bundle",
      },
      {
        id: "delivery",
        name: "Estimated Delivery",
        use: "Trei pași: comandă azi, procesare, livrare. Zilele minime și maxime le setezi tu. Data se calculează în browser.",
        note: "Nu întreabă un curier și nu promite o dată reală de livrare.",
        kind: "delivery",
      },
      {
        id: "badges",
        name: "Payment Badges Pro",
        use: "Iconițe Visa, PayPal și altele, sub butonul de cumpărare.",
        note: "Doar încredere vizuală. Nu schimbă metodele de plată.",
        kind: "badges",
      },
      {
        id: "upsell",
        name: "Product Upsells",
        use: "Produse extra pe pagina de produs. Sursa poate fi produse alese de tine, o colecție, sau recomandări Shopify. Poți preselecta, pune poză și descriere proprie.",
        note: "Comutatorul le adaugă după Add to cart. Butonul de pe rând le adaugă pe loc, fără să aștepte butonul principal. Procentul afișat nu schimbă prețul din checkout.",
        kind: "upsell",
      },
      {
        id: "tabs",
        name: "Content Tabs Pro",
        use: "Tab-uri cu text sau imagine: ingrediente, cum se folosește. Doar tabul deschis e vizibil.",
        note: "Nu încarcă un produs și nu adaugă în coș.",
        kind: "tabs",
      },
      {
        id: "faq",
        name: "FAQ Pro",
        use: "Întrebări care se deschid la click. Fiecare bloc Question are întrebarea și răspunsul.",
        note: "Nu schimbă prețul.",
        kind: "faq",
      },
      {
        id: "testimonials",
        name: "Testimonials Pro",
        use: "Recenzii sau postări: nume, text, poză, platformă.",
        note: "Le scrii tu. Nu sunt recenzii trase automat din Shopify.",
        kind: "testimonials",
      },
    ],
  },
  {
    id: "cart",
    title: "În coș",
    lead: "Nu e o secțiune din editor. Cele trei piese stau în Theme settings.",
    sections: [
      {
        id: "cart-promo",
        name: "Cronometru, bară și upsell",
        use: "Cronometrul pornește când coșul e deschis prima dată în tab. Bara arată cât mai lipsește până la suma scrisă de tine. Upsell-ul este un singur produs, cu buton Add.",
        note: "Cronometrul nu se resetează când închizi coșul. În text, [amount] e înlocuit cu diferența. Produsul sugerat se ascunde dacă e deja în coș.",
        kind: "cart",
      },
    ],
  },
];
