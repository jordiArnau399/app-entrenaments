# Ritme

App per a entrenadors personals i els seus clients. L'entrenador prepara exercicis, plantilles i plans. El client veu què toca avui, ho anota (també sense cobertura) i en segueix el resultat.

De moment és per a l'ús intern de Jordi Arnau. El model de dades ja està preparat per a més d'un entrenador: cada client, exercici i pla pengen d'un entrenador.

La mateixa app serveix per al telèfon (iOS i Android, amb Expo Go) i per a l'ordinador. Al navegador, l'entrenador té una vista ampla: menú lateral, taules i gràfics grans.

## Provar-la sense ser programador

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

No hi ha un enllaç públic: l'app s'obre des del teu ordinador. El QR del terminal és la manera d'entrar-hi al telèfon.

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
