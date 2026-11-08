# tomandes-report

Formulář [tomandes.eu/report](https://tomandes.eu/report/) posílá hlášení sem: jedna funkce na Vercelu
(`api/report.ts`) z něj udělá **issue v repozitáři dané aplikace**. Uživatel nepotřebuje GitHub účet.

- **Které aplikace a kam:** `lib/apps.ts`. Repo se bere jen odtud, nikdy z požadavku.
- **Veřejné issue:**
  - název `[Chyba] …` / `[Nápad] …` / `[Otázka] …`;
  - štítky `nahlášeno z webu`, `bug` / `enhancement` / `question`, u žáků `žák ZUŠ MK` (zaškrtávátko „Jsem žákem ZUŠ
    Moravský Krumlov“ u Keyboard Utils a Muzia; jinak se formulář ani odpověď pro žáky nijak neliší). Chybějící štítky
    se založí samy.
- **Kontakt** (nepovinný) nikdy nejde do veřejného issue, ale do **soukromého** repa `report-contacts` s odkazem na
  hlášení. GitHub o něm pošle e-mail jako o každém issue.
- **Ochrana:**
  - skryté pole-past a minimální doba vyplnění 3 s;
  - CORS jen pro tomandes.eu;
  - uživatelský text nikoho neoznačí (`@`) ani neodkáže (`#123`).

## Nasazení (jednou)

1. **Soukromé repo pro kontakty:** `tomandesMSH/report-contacts`, prázdné, *Private*.
2. **Token:** GitHub → *Settings → Developer settings → Personal access tokens → Fine-grained tokens →
   Generate new token*:
   - **Repository access:** *Only select repositories*, vyber:
     - Keyboard-Utils, Keyboard-Hero, KASPAR, Custom-AutoPlay, SoundpadTranslator, ClipThat, tomandesMSH,
     - report-contacts;
   - **Permissions → Repository permissions → Issues: Read and write**. Nic jiného;
   - **Expiration:** max. 1 rok. Než vyprší, vygeneruj nový a vyměň ho na Vercelu.
3. **Vercel:** *Add New → Project* → importuj tohle repo.
   - Jméno projektu **`tomandes-report`**. Formulář posílá na `https://tomandes-report.vercel.app/api/report`; při
     jiném jménu změň `ENDPOINT` v `tomandesMSH/report/report.js`.
   - *Settings → Environment Variables:* `GITHUB_TOKEN` = token z kroku 2. Pak *Redeploy*.
4. **Vyzkoušej:** odešli hlášení z tomandes.eu/report (třeba u „Jiné / tenhle web“) a zavři ho.

Přidat aplikaci: řádek v `lib/apps.ts`, `<option>` v `tomandesMSH/report/index.html`, repo do tokenu.

## Vývoj

```bash
npm install
npm test          # testy (sestavení issue, ověření, CORS, kontakt jen do soukromého repa)
npm run dev       # API na http://localhost:8787, formulář na http://localhost:8788/report/
                  # bez GITHUB_TOKEN se GitHub jen předstírá a vypisuje do konzole
```
