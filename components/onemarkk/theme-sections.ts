export type ThemeSection = {
  id: string;
  name: string;
  use: string;
  note?: string;
};

export type ThemeGroup = {
  id: string;
  title: string;
  sections: ThemeSection[];
};

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: "chrome",
    title: "Deasupra paginii",
    sections: [
      {
        id: "announcement",
        name: "Announcement Pro",
        use: "Banda de deasupra header-ului: cronometru, mesaj de livrare sau ofertă. Pe telefon le poate roti. Link-urile sunt opționale.",
        note: "Nu ține stoc rezervat și nu aplică reducerea din text.",
      },
      {
        id: "ticker",
        name: "Horizontal Ticker Pro",
        use: "Fâșie de texte care alunecă. Fiecare bloc Text e o frază, de exemplu livrare rapidă sau retur 30 de zile.",
        note: "Nu are legătură cu coșul.",
      },
      {
        id: "icons",
        name: "Icon Bar Pro",
        use: "Rând de iconițe cu titlu scurt: livrare, retur, plată. Poate fi grilă sau slider. E deja pusă pe acasă și pe produs.",
        note: "Autoplay mișcă iconițele, nu videoclipuri.",
      },
      {
        id: "divider",
        name: "Section Divider Pro",
        use: "Linie sau formă între secțiuni. În temă stă deasupra footer-ului.",
        note: "Doar decor.",
      },
    ],
  },
  {
    id: "product",
    title: "Pe pagina de produs",
    sections: [
      {
        id: "stars",
        name: "Star Rating Pro",
        use: "Steluțe lângă titlu. Nota și numărul de review-uri le scrii tu.",
        note: "Nu citește aplicația de review-uri.",
      },
      {
        id: "bullets",
        name: "Bullet Points Pro",
        use: "Lista scurtă de beneficii de sub titlu. Fiecare punct are text și, opțional, o iconiță.",
      },
      {
        id: "slider",
        name: "Image/Video Slider Pro",
        use: "Carusel de poze sau video. Fiecare slide are media și, opțional, un link.",
        note: "Autoplay-ul e oprit în temă. Video-ul pornește doar când slide-ul lui e pe ecran.",
      },
      {
        id: "bundle",
        name: "Bundle Save",
        use: "Opțiuni de 1, 2, 3 bucăți în locul cantității clasice. Cantitatea bifată intră în formular. Aceeași variantă o pune butonul normal de add to cart; variante diferite le adaugă scriptul.",
        note: "Procentul afișat nu e o reducere Shopify. Cadourile de dedesubt sunt doar afișate.",
      },
      {
        id: "delivery",
        name: "Estimated Delivery",
        use: "Trei pași: comandă azi, procesare, livrare. Zilele minime și maxime le setezi tu, iar data se calculează în browser.",
        note: "Nu întreabă un curier și nu promite o dată reală.",
      },
      {
        id: "badges",
        name: "Payment Badges Pro",
        use: "Iconițe Visa, PayPal și altele, sub butonul de cumpărare.",
        note: "Doar încredere vizuală.",
      },
      {
        id: "upsell",
        name: "Product Upsells",
        use: "Produse extra, alese de tine, dintr-o colecție sau din recomandările Shopify. Comutatorul le adaugă după Add to cart; butonul de pe rând le adaugă pe loc.",
        note: "Procentul afișat nu schimbă prețul din checkout.",
      },
      {
        id: "tabs",
        name: "Content Tabs Pro",
        use: "Tab-uri cu text sau imagine, de exemplu ingrediente sau cum se folosește. Doar tabul deschis e vizibil.",
        note: "Nu încarcă un produs și nu adaugă în coș.",
      },
      {
        id: "faq",
        name: "FAQ Pro",
        use: "Întrebări care se deschid la click. Fiecare bloc Question are întrebarea și răspunsul.",
        note: "Nu schimbă prețul.",
      },
      {
        id: "testimonials",
        name: "Testimonials Pro",
        use: "Recenzii sau postări: nume, text, poză, platformă.",
        note: "Le scrii tu. Nu vin automat din Shopify.",
      },
    ],
  },
  {
    id: "cart",
    title: "În coș",
    sections: [
      {
        id: "cart-timer",
        name: "Cronometru",
        use: "Pornește când coșul e deschis prima dată în acel tab.",
        note: "Nu se resetează când închizi coșul. Stă în Theme settings, nu într-o secțiune.",
      },
      {
        id: "cart-bar",
        name: "Bara până la sumă",
        use: "Arată cât mai lipsește până la suma pe care ai scris-o.",
        note: "În text, [amount] e înlocuit cu diferența.",
      },
      {
        id: "cart-upsell",
        name: "Upsell în coș",
        use: "Un singur produs, cu buton Add.",
        note: "Se ascunde dacă produsul e deja în coș.",
      },
    ],
  },
];
