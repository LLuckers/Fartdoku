# Fartdoku

*Ein Rätsel, das zum Himmel stinkt.*

Im Schloss Le Pups gab es einen olfaktorischen Zwischenfall der Stufe 4. Ein Frenchie hat verbotene Snacks gefuttert und eine Gaswolke freigesetzt. Du findest heraus, welcher Hund wo war – und wer es war.

## Spielprinzip (wie Murdoku)

- Der Schlossplan ist ein N×N-Gitter, aufgeteilt in Räume mit Möbeln.
- Platziere alle Frenchies und das Beweisstück (den Snack).
- In jeder Zeile und jeder Spalte steht genau eine Figur – wie beim Sudoku.
- Auf Möbeln (Regal, Kamin, Kühlschrank …) kann niemand stehen. Auf Samtkissen, Teppichen, Sesseln und Hundekörben schon.
- „Neben“ heißt direkt links, rechts, darüber oder darunter und im selben Raum.
- „Nördlich von“ heißt irgendwo weiter oben, egal in welcher Spalte.
- Der Täter war allein mit dem Snack: Im Raum des Snacks liegt genau ein Frenchie.

Die Zeugenaussagen auf den Karten (Butler, Köchin, Labor-Bericht …) bestimmen die Aufstellung eindeutig.

## Inhalt

- 12 Fälle in vier Stufen: Leichter Mief, Dicke Luft, Grüne Wolke, Biologischer Ökodemozid (4×4 bis 8×8)
- Zufallsfall-Generator für endlosen Nachschub
- Steckbriefe aller Verdächtigen und Snacks

## Entwicklung

Statische Seite ohne Build-Abhängigkeiten.

```bash
npm start       # lokaler Server auf http://localhost:5173
npm test        # prüft, dass jeder Fall genau eine Lösung hat
npm run build   # dist/fartdoku.html (eine Datei zum Weitergeben)
```

| Datei | Inhalt |
|---|---|
| `js/data.js` | Hunde, Räume, Möbel, Snacks, Zeugen, Schlosspläne, Fälle |
| `js/engine.js` | Löser, Hinweis-Generator (garantiert eindeutige Lösung), Texte |
| `js/art.js` | SVG-Grafiken: schwarzer Frenchie mit Accessoires, Möbel, Snacks, Logo |
| `js/app.js` | Oberfläche, Spielzustand, Fortschritt (localStorage) |
| `css/style.css` | Stil |

Neue Schlosspläne kommen in `FD.MAPS` (ein Buchstabe pro Feld für Räume und Möbel), neue Fälle in `FD.CASES`. Über `salt` lässt sich ein anderer Fall aus demselben Plan würfeln.
