# Ritme

App per a entrenadors personals i els seus clients. L'entrenador prepara exercicis, plantilles i plans. El client veu què toca avui, ho anota (també sense cobertura) i en segueix el resultat.

De moment és per a l'ús intern de Jordi Arnau. El model de dades ja està preparat per a més d'un entrenador: cada client, exercici i pla pengen d'un entrenador.

La mateixa app serveix per al telèfon (iOS i Android, amb Expo Go) i per a l'ordinador. Al navegador, l'entrenador té una vista ampla: menú lateral, taules i gràfics grans.

## Obrir-la al navegador, sense instal·lar res

Quan la web estigui publicada, l'adreça és:

**https://jordiarnau399.github.io/app-entrenaments/**

Funciona al navegador de l'ordinador i al del telèfon. No cal Node ni Expo Go. A la primera pantalla tries **Entra com a entrenador** o un client (Pau o Marta). Les dades de la demostració es queden en aquell navegador. L'ordinador i el telèfon no comparteixen els canvis: cadascun té la seva còpia.

El repositori és privat. GitHub només publica GitHub Pages d'un repositori privat si el compte és de pagament (Pro o superior). Amb el pla gratuït, Pages només funciona si el repositori és públic. Els passos, un cop fusionada aquesta branca amb `main`, són:

1. Obre el repositori a GitHub.
2. Si a **Settings → Pages** no hi ha l'opció **GitHub Actions**, el pla no permet Pages en un repositori privat. Ves a **Settings → General**, al final, **Change repository visibility**, i posa'l **Public**.
3. **Settings → Pages → Build and deployment → Source**: tria **GitHub Actions**.
4. Fusiona la pull request. El workflow «Publica la web» s'engega sol. Si ja havies fusionat abans d'activar Pages, obre **Actions → Publica la web → Run workflow**.
5. Quan el punt verd aparegui, obre l'adreça de dalt.

## Comptes reals (Supabase)

La web publicada segueix en mode demostració fins que enganxes les claus del núvol. Quan ho facis, la primera pantalla demana correu i contrasenya. Cada entrenador només veu els seus clients. Cada client només veu el seu pla. Això ho controla la base de dades, no només l'app. Al telèfon les dades es guarden primer a l'aparell i després es sincronitzen.

Encara no tens projecte de Supabase. Fes això una vegada:

1. Entra a [https://supabase.com](https://supabase.com) i crea un compte (amb el teu correu n'hi ha prou).
2. Prem **New project**. Posa-li un nom (per exemple Ritme), una contrasenya de base de dades (guarda-la) i la regió més propera. Espera que el projecte estigui verd.
3. Al menú esquerre, **Project Settings** (la roda) → **API**. Copia dues coses:
   - **Project URL** (sembla `https://abcd.supabase.co`)
   - **anon public** (una clau llarga, dins API Keys)
4. Al menú esquerre, **SQL Editor** → **New query**. Obre el fitxer `supabase/migrations/20261121120000_accounts.sql` d'aquest projecte, copia'l tot, enganxa'l a l'editor i prem **Run**. Ha de dir que ha anat bé.
5. Nova consulta. Obre `supabase/seed.sql`, copia'l, enganxa'l i prem **Run**. No crea usuaris: el primer entrenador es registra des de l'app.
6. Al menú esquerre, **Authentication** → **Sign In / Providers** → **Email**. Desactiva **Confirm email** i desa. Si el deixes activat, cal obrir el correu abans de poder entrar.
7. **Authentication** → **URL Configuration**.
   - **Site URL**: `https://jordiarnau399.github.io/app-entrenaments`
   - **Redirect URLs**: afegeix `https://jordiarnau399.github.io/app-entrenaments/**`
   - Desa.
8. A GitHub, obre el repositori **app-entrenaments** → **Settings** → **Secrets and variables** → **Actions**.
   - Pestanya **Variables** → **New repository variable**. Nom exacte: `EXPO_PUBLIC_SUPABASE_URL`. Valor: el Project URL.
   - Pestanya **Secrets** → **New repository secret**. Nom exacte: `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Valor: la clau anon public.
9. Pestanya **Actions** → **Publica la web** → **Run workflow**. Quan acabi en verd, torna a obrir [https://jordiarnau399.github.io/app-entrenaments/](https://jordiarnau399.github.io/app-entrenaments/). Veuràs el formulari d'entrada.

Per donar d'alta algú:

1. Tu et registres amb **Soc entrenador nou**.
2. A **Clients** → **Nou client**, escrius el nom i el correu i prems **Crea el codi**. L'app et mostra un codi de 6 lletres.
3. El client, al seu telèfon o ordinador, obre la mateixa adreça, tria **Tinc un codi d'invitació** i escriu el seu correu, una contrasenya i el codi.

Si més endavant vols la consola en comptes de l'editor SQL: instal·la l'eina de Supabase, enllaça el projecte i executa `supabase db push`. El camí de dalt, enganxant l'SQL, és suficient.

## Provar-la en local

Necessites dues coses instal·lades una sola vegada:

1. **Node.js**, des de [https://nodejs.org](https://nodejs.org). Tria la versió LTS i segueix l'instal·lador. Això també instal·la l'ordre `npm`.
2. **Expo Go**, des de l'App Store (iPhone) o Google Play (Android).

Després:

1. Descarrega aquesta carpeta. A GitHub, el botó verd **Code** i després **Download ZIP**. Descomprimeix-lo. Si ja tens Git: `git clone` de l'adreça del repositori i entra a la carpeta.
2. Obre la **Terminal** (al Mac) o el **Símbol del sistema** (a Windows).
3. Ves a la carpeta del projecte. Al Mac pots escriure `cd ` (amb l'espai) i arrossegar la carpeta a la finestra. Prem Retorn.
4. Escriu això i prem Retorn. Pot trigar un minut:

   ```bash
   npm install
   ```

5. Engega l'app:

   ```bash
   npm start
   ```

6. Al terminal apareix un **codi QR** i una línia que diu `Web: http://localhost:8081`.

### L'ordinador, vista d'entrenador

Obre el navegador (Chrome, Safari o Edge) i entra a:

**http://localhost:8081**

Tria **Entra com a entrenador**. Ets el Jordi de la demostració: no cal contrasenya ni compte.

### El telèfon, vista de client

1. El telèfon i l'ordinador han de ser a la **mateixa Wi-Fi**.
2. Obre **Expo Go**.
3. Escaneja el QR del terminal (a l'iPhone, la càmera també serveix i obre Expo Go).
4. Quan s'obri Ritme, tria **Pau Vidal** o **Marta Soler**.

Si el QR no es connecta, al terminal prem `s` per canviar a «Expo Go» si et demana un altre mode, i comprova que no siguis en una Wi-Fi d'invitats que aïlla els aparells.

El QR del terminal és la manera d'obrir la versió nativa al telèfon. La versió de navegador pública és l'adreça de dalt.

## El recorregut de la demostració

Les dades de prova ja hi són: un entrenador (Jordi Arnau), dos clients, exercicis, dues plantilles i sessions anotades. El dia que obres l'app per primer cop, en Pau té entrenament.

1. Al navegador, entra com a entrenador.
2. Ves a **Plantilles**, obre'n una o crea'n una de nova, i prem **Assigna a un client**. El pla que es crea és una còpia: si després canvies la plantilla, el client no es veu afectat.
3. A la fitxa del client, pestanya **Pla**, canvia un pes i prem **Desa en aquest pla**. Això només toca les sessions d'avui i les futures.
4. **Canvia de perfil** i entra com el client. A **Avui** veuràs el pes nou.
5. Prem **Comença la sessió**. A **Ajustos**, o al final del registre, activa **Simula sense connexió**, anota les sèries i desa. Queda pendent de sincronitzar, dins el telèfon.
6. Torna a activar la connexió i prem **Sincronitza ara**.
7. Torna a entrar com a entrenador i obre el client. La sessió surt com a feta, amb el planificat al costat del fet, el compliment, l'esforç i el gràfic de pes.

Al mateix navegador pots fer tot el recorregut: estreta la finestra per veure la vista de telèfon. Telèfon i ordinador comparteixen les dades pel concentrador local que engega `npm start`, sempre que siguin a la mateixa xarxa. A l'iPhone, iOS de vegades bloqueja aquesta connexió sense xifrat; si passa, fes el recorregut sencer al navegador.

**Reinicia la demostració**, al menú de l'entrenador o a la pantalla inicial, torna a deixar les dades de prova.

## Què hi ha en aquesta versió

- Biblioteca d'exercicis de força (sèries, repeticions, pes) i de cardio (temps, distància, ritme).
- Plantilles reutilitzables.
- Assignar una plantilla fa una còpia per al client, amb data d'inici i setmanes, i es pot personalitzar.
- El client veu l'entrenament d'avui, el calendari i anota la sessió, amb sensació i esforç de l'1 al 10.
- Gràfics: pes màxim per exercici, percentatge de sessions fetes i esforç al llarg del temps. El client veu els seus; l'entrenador, els de cada client.
- Mode sense connexió: primer es desa a l'aparell (SQLite) i després se sincronitza. Al navegador, si el motor SQLite no es pot obrir, es fa servir la memòria del navegador.
- Recordatori diari al telèfon, a l'hora que triï el client. Al navegador només es desa l'hora.

Encara no hi són, i el model de dades ja té el lloc per a quan toqui: avisos a l'entrenador quan una sessió es fa o es salta, xat, vídeos dels exercicis, cobraments i alta d'entrenadors pel seu compte. Una sessió passada sense registre compta com a saltada; des del calendari encara es pot anotar.

## Si més endavant vols un servidor

Sense configurar res, l'app funciona. Si vols que les dades visquin fora de l'ordinador, crea un projecte a [Supabase](https://supabase.com), executa el fitxer `supabase/schema.sql` a l'editor SQL i crea un fitxer `.env` a l'arrel (hi ha l'exemple `.env.example`):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://el-teu-projecte.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=la-clau-anon
```

Torna a engegar amb `npm start`. La política d'aquest esquema és oberta, pensada per a la prova. Abans de posar-hi clients reals s'ha de tancar perquè cada entrenador només vegi els seus.

## Proves automàtiques

Comproven la còpia del pla, el planificat contra el fet, el percentatge de compliment i la cua de sincronització:

```bash
npm test
```
