"use strict";

(() => {
  const translations = {
    en: {
      title: "XAVERT | Tools, Workflows & AI Collaboration",
      description: "Fast browser tools, guided workflows and a simpler way to work with artificial intelligence.",
      navTools: "Tools", navWork: "Work", navAi: "AI", languageLabel: "Language", exploreTools: "Explore tools",
      eyebrow: "The practical side of digital work",
      heroTitle: "One clear workspace for tools, documents and AI.",
      heroText: "Solve everyday digital tasks with fast browser tools, guided workflows and a simpler way to work with artificial intelligence.",
      searchPlaceholder: "Search a tool, format or task...",
      trustTools: "57 focused tools", trustPrivacy: "Private in your browser", trustSignup: "No sign-up",
      consoleTools: "Quick tools", consoleToolsText: "Convert, clean, create and check",
      consoleWork: "Workflows", consoleWorkText: "Documents and repeatable tasks",
      consoleAi: "AI collaboration", consoleAiText: "From human intent to useful output",
      consoleNote: "Your files stay on your device whenever the tool allows it.",
      pathKicker: "Choose the right path", pathTitle: "Less hunting. More doing.",
      pathText: "Start with a quick utility, follow a complete workflow or prepare a task for AI.",
      pathTools: "XAVERT Tools", pathToolsText: "Fast utilities for files, code, data, images and everyday tasks.", browseTools: "Browse all tools →",
      pathWork: "XAVERT Work", pathWorkText: "Connected steps for documents, office work and repeatable processes.",
      pathAi: "XAVERT AI", pathAiText: "Guided collaboration that turns your goal into a useful, verifiable result.",
      inDevelopment: "In development", openWorkspace: "Open workspace →", openAi: "Open AI workspace →", installEyebrow: "XAVERT on every device",
      installTitle: "Keep your workspace one tap away.", installText: "Add XAVERT to your phone or install it on your computer.", installGuide: "How to add it", installButton: "Install XAVERT",
      installIos: "iPhone or iPad: Open XAVERT in Safari, tap Share, then Add to Home Screen.",
      installAndroid: "Android: Open the browser menu and choose Install app or Add to Home screen.",
      installComputer: "Computer: In Chrome or Edge, use the install icon in the address bar or the browser menu.",
      installNote: "An internet connection is still required to use the tools.",
      developerTitle: "Developer Tools", developerDescription: "Build, format, test and manage code, SEO, structured data and web projects.",
      documentTitle: "Document Tools", documentDescription: "Work with PDF and Word documents directly in your browser.",
      imageTitle: "Image & Design Tools", imageDescription: "Create, inspect and improve images, graphics, QR codes and visual assets.",
      utilityTitle: "Utility Tools", utilityDescription: "Practical everyday tools for text, security, time, measurements and files.",
      dataTitle: "Data Conversion Tools", dataDescription: "Transform spreadsheet and structured data into useful formats for analysis and reporting.", aiTitle: "AI Collaboration Tools", aiDescription: "Prepare clearer AI requests and review responses before using them in real work.",
      showMore: "Show all", showLess: "Show less", openTool: "Open tool  →", noResults: "No matching tools"
    },
    it: {
      title: "XAVERT | Strumenti, flussi di lavoro e collaborazione con l'IA",
      description: "Strumenti veloci nel browser, procedure guidate e un modo più semplice di lavorare con l'intelligenza artificiale.",
      navTools: "Strumenti", navWork: "Lavoro", navAi: "IA", languageLabel: "Lingua", exploreTools: "Esplora strumenti",
      eyebrow: "Il lato pratico del lavoro digitale",
      heroTitle: "Un unico spazio chiaro per strumenti, documenti e IA.",
      heroText: "Risolvi le attività digitali quotidiane con strumenti veloci, procedure guidate e un modo più semplice di collaborare con l'intelligenza artificiale.",
      searchPlaceholder: "Cerca uno strumento, un formato o un'attività...",
      trustTools: "57 strumenti mirati", trustPrivacy: "Privato nel tuo browser", trustSignup: "Nessuna registrazione",
      consoleTools: "Strumenti rapidi", consoleToolsText: "Converti, pulisci, crea e controlla",
      consoleWork: "Flussi di lavoro", consoleWorkText: "Documenti e attività ripetibili",
      consoleAi: "Collaborazione con l'IA", consoleAiText: "Dall'intenzione umana a un risultato utile",
      consoleNote: "I tuoi file restano sul dispositivo ogni volta che lo strumento lo consente.",
      pathKicker: "Scegli il percorso giusto", pathTitle: "Meno ricerca. Più risultati.",
      pathText: "Parti da uno strumento rapido, segui un flusso completo oppure prepara un'attività per l'IA.",
      pathTools: "XAVERT Tools", pathToolsText: "Strumenti veloci per file, codice, dati, immagini e attività quotidiane.", browseTools: "Esplora tutti gli strumenti →",
      pathWork: "XAVERT Work", pathWorkText: "Passaggi collegati per documenti, ufficio e processi ripetibili.",
      pathAi: "XAVERT AI", pathAiText: "Una collaborazione guidata che trasforma il tuo obiettivo in un risultato utile e verificabile.",
      inDevelopment: "In sviluppo", openWorkspace: "Apri lo spazio di lavoro →", openAi: "Apri lo spazio IA →", installEyebrow: "XAVERT su ogni dispositivo",
      installTitle: "Il tuo spazio di lavoro sempre a portata di mano.", installText: "Aggiungi XAVERT al telefono oppure installalo sul computer.", installGuide: "Come aggiungerlo", installButton: "Installa XAVERT",
      installIos: "iPhone o iPad: apri XAVERT in Safari, tocca Condividi e poi Aggiungi alla schermata Home.",
      installAndroid: "Android: apri il menu del browser e scegli Installa app oppure Aggiungi a schermata Home.",
      installComputer: "Computer: in Chrome o Edge usa l'icona di installazione nella barra degli indirizzi oppure il menu del browser.",
      installNote: "Per utilizzare gli strumenti è ancora necessaria una connessione Internet.",
      developerTitle: "Strumenti per sviluppatori", developerDescription: "Crea, formatta, verifica e gestisci codice, SEO, dati strutturati e progetti web.",
      documentTitle: "Strumenti per documenti", documentDescription: "Lavora con documenti PDF e Word direttamente nel browser.",
      imageTitle: "Immagini e design", imageDescription: "Crea, controlla e migliora immagini, grafiche, codici QR e risorse visive.",
      utilityTitle: "Strumenti di utilità", utilityDescription: "Strumenti quotidiani per testo, sicurezza, tempo, misure e file.",
      dataTitle: "Conversione dati", dataDescription: "Trasforma fogli di calcolo e dati strutturati in formati utili per analisi e report.", aiTitle: "Strumenti di collaborazione IA", aiDescription: "Prepara richieste più chiare per l'IA e controlla le risposte prima di usarle nel lavoro reale.",
      showMore: "Mostra tutti", showLess: "Mostra meno", openTool: "Apri strumento  →", noResults: "Nessuno strumento trovato"
    },
    es: {
      title: "XAVERT | Herramientas, flujos de trabajo y colaboración con IA",
      description: "Herramientas rápidas en el navegador, flujos guiados y una forma más sencilla de trabajar con inteligencia artificial.",
      navTools: "Herramientas", navWork: "Trabajo", navAi: "IA", languageLabel: "Idioma", exploreTools: "Explorar herramientas",
      eyebrow: "El lado práctico del trabajo digital", heroTitle: "Un espacio claro para herramientas, documentos e IA.",
      heroText: "Resuelve tareas digitales con herramientas rápidas, flujos guiados y una forma más sencilla de colaborar con la inteligencia artificial.",
      searchPlaceholder: "Busca una herramienta, formato o tarea...", trustTools: "57 herramientas específicas", trustPrivacy: "Privado en tu navegador", trustSignup: "Sin registro",
      consoleTools: "Herramientas rápidas", consoleToolsText: "Convierte, limpia, crea y comprueba", consoleWork: "Flujos de trabajo", consoleWorkText: "Documentos y tareas repetibles",
      consoleAi: "Colaboración con IA", consoleAiText: "De la intención humana a un resultado útil", consoleNote: "Tus archivos permanecen en tu dispositivo siempre que la herramienta lo permita.",
      pathKicker: "Elige el camino adecuado", pathTitle: "Menos búsqueda. Más acción.", pathText: "Empieza con una utilidad, sigue un flujo completo o prepara una tarea para la IA.",
      pathTools: "XAVERT Tools", pathToolsText: "Utilidades para archivos, código, datos, imágenes y tareas diarias.", browseTools: "Ver todas las herramientas →",
      pathWork: "XAVERT Work", pathWorkText: "Pasos conectados para documentos, oficina y procesos repetibles.", pathAi: "XAVERT AI", pathAiText: "Colaboración guiada que convierte tu objetivo en un resultado útil y verificable.",
      inDevelopment: "En desarrollo", openWorkspace: "Abrir espacio de trabajo →", openAi: "Abrir espacio de IA →", installEyebrow: "XAVERT en todos tus dispositivos", installTitle: "Tu espacio de trabajo a un toque.", installText: "Añade XAVERT a tu teléfono o instálalo en tu ordenador.", installGuide: "Cómo añadirlo", installButton: "Instalar XAVERT",
      installIos: "iPhone o iPad: abre XAVERT en Safari, toca Compartir y Añadir a pantalla de inicio.", installAndroid: "Android: abre el menú del navegador y elige Instalar aplicación o Añadir a pantalla de inicio.",
      installComputer: "Ordenador: en Chrome o Edge usa el icono de instalación de la barra de direcciones o el menú del navegador.", installNote: "Todavía se necesita conexión a Internet para usar las herramientas.",
      developerTitle: "Herramientas para desarrolladores", developerDescription: "Crea, formatea, prueba y gestiona código, SEO, datos estructurados y proyectos web.", documentTitle: "Herramientas de documentos", documentDescription: "Trabaja con documentos PDF y Word directamente en el navegador.",
      imageTitle: "Imagen y diseño", imageDescription: "Crea, revisa y mejora imágenes, gráficos, códigos QR y recursos visuales.", utilityTitle: "Utilidades", utilityDescription: "Herramientas diarias para texto, seguridad, tiempo, medidas y archivos.",
      dataTitle: "Conversión de datos", dataDescription: "Transforma hojas de cálculo y datos estructurados para análisis e informes.", aiTitle: "Herramientas de colaboración con IA", aiDescription: "Prepara solicitudes más claras para la IA y revisa sus respuestas antes de utilizarlas.", showMore: "Mostrar todo", showLess: "Mostrar menos", openTool: "Abrir herramienta  →", noResults: "No se encontraron herramientas"
    },
    fr: {
      title: "XAVERT | Outils, flux de travail et collaboration avec l'IA", description: "Des outils rapides dans le navigateur, des parcours guidés et une façon plus simple de travailler avec l'intelligence artificielle.",
      navTools: "Outils", navWork: "Travail", navAi: "IA", languageLabel: "Langue", exploreTools: "Explorer les outils", eyebrow: "Le côté pratique du travail numérique",
      heroTitle: "Un espace clair pour les outils, les documents et l'IA.", heroText: "Résolvez vos tâches numériques avec des outils rapides, des parcours guidés et une collaboration plus simple avec l'intelligence artificielle.",
      searchPlaceholder: "Rechercher un outil, un format ou une tâche...", trustTools: "57 outils ciblés", trustPrivacy: "Privé dans votre navigateur", trustSignup: "Sans inscription",
      consoleTools: "Outils rapides", consoleToolsText: "Convertir, nettoyer, créer et vérifier", consoleWork: "Flux de travail", consoleWorkText: "Documents et tâches répétables", consoleAi: "Collaboration avec l'IA", consoleAiText: "De l'intention humaine à un résultat utile", consoleNote: "Vos fichiers restent sur votre appareil lorsque l'outil le permet.",
      pathKicker: "Choisissez le bon parcours", pathTitle: "Moins chercher. Plus accomplir.", pathText: "Utilisez un outil rapide, suivez un flux complet ou préparez une tâche pour l'IA.",
      pathTools: "XAVERT Tools", pathToolsText: "Des outils rapides pour les fichiers, le code, les données, les images et le quotidien.", browseTools: "Voir tous les outils →", pathWork: "XAVERT Work", pathWorkText: "Des étapes reliées pour les documents, le bureau et les processus répétables.", pathAi: "XAVERT AI", pathAiText: "Une collaboration guidée qui transforme votre objectif en résultat utile et vérifiable.",
      inDevelopment: "En développement", openWorkspace: "Ouvrir l'espace de travail →", openAi: "Ouvrir l'espace IA →", installEyebrow: "XAVERT sur chaque appareil", installTitle: "Votre espace de travail à portée de main.", installText: "Ajoutez XAVERT à votre téléphone ou installez-le sur votre ordinateur.", installGuide: "Comment l'ajouter", installButton: "Installer XAVERT",
      installIos: "iPhone ou iPad : ouvrez XAVERT dans Safari, touchez Partager puis Sur l'écran d'accueil.", installAndroid: "Android : ouvrez le menu du navigateur et choisissez Installer l'application ou Ajouter à l'écran d'accueil.", installComputer: "Ordinateur : dans Chrome ou Edge, utilisez l'icône d'installation de la barre d'adresse ou le menu du navigateur.", installNote: "Une connexion Internet reste nécessaire pour utiliser les outils.",
      developerTitle: "Outils pour développeurs", developerDescription: "Créez, formatez, testez et gérez le code, le SEO, les données structurées et les projets web.", documentTitle: "Outils documentaires", documentDescription: "Travaillez avec des documents PDF et Word directement dans le navigateur.", imageTitle: "Image et design", imageDescription: "Créez, contrôlez et améliorez images, graphiques, codes QR et ressources visuelles.", utilityTitle: "Outils pratiques", utilityDescription: "Des outils quotidiens pour le texte, la sécurité, le temps, les mesures et les fichiers.", dataTitle: "Conversion de données", dataDescription: "Transformez les feuilles de calcul et données structurées pour l'analyse et les rapports.", aiTitle: "Outils de collaboration avec l'IA", aiDescription: "Préparez des demandes plus claires pour l'IA et vérifiez ses réponses avant de les utiliser.", showMore: "Tout afficher", showLess: "Afficher moins", openTool: "Ouvrir l'outil  →", noResults: "Aucun outil trouvé"
    },
    de: {
      title: "XAVERT | Tools, Arbeitsabläufe und KI-Zusammenarbeit", description: "Schnelle Browser-Tools, geführte Abläufe und eine einfachere Zusammenarbeit mit künstlicher Intelligenz.",
      navTools: "Tools", navWork: "Arbeit", navAi: "KI", languageLabel: "Sprache", exploreTools: "Tools entdecken", eyebrow: "Die praktische Seite digitaler Arbeit",
      heroTitle: "Ein klarer Arbeitsbereich für Tools, Dokumente und KI.", heroText: "Erledigen Sie digitale Aufgaben mit schnellen Browser-Tools, geführten Abläufen und einer einfacheren Zusammenarbeit mit künstlicher Intelligenz.",
      searchPlaceholder: "Tool, Format oder Aufgabe suchen...", trustTools: "57 gezielte Tools", trustPrivacy: "Privat im Browser", trustSignup: "Keine Anmeldung",
      consoleTools: "Schnelle Tools", consoleToolsText: "Konvertieren, bereinigen, erstellen und prüfen", consoleWork: "Arbeitsabläufe", consoleWorkText: "Dokumente und wiederholbare Aufgaben", consoleAi: "KI-Zusammenarbeit", consoleAiText: "Von menschlicher Absicht zu brauchbaren Ergebnissen", consoleNote: "Ihre Dateien bleiben auf Ihrem Gerät, wann immer das Tool dies ermöglicht.",
      pathKicker: "Den richtigen Weg wählen", pathTitle: "Weniger suchen. Mehr erledigen.", pathText: "Starten Sie mit einem Tool, folgen Sie einem Ablauf oder bereiten Sie eine Aufgabe für die KI vor.", pathTools: "XAVERT Tools", pathToolsText: "Schnelle Hilfsmittel für Dateien, Code, Daten, Bilder und tägliche Aufgaben.", browseTools: "Alle Tools ansehen →", pathWork: "XAVERT Work", pathWorkText: "Verknüpfte Schritte für Dokumente, Büroarbeit und wiederholbare Prozesse.", pathAi: "XAVERT AI", pathAiText: "Geführte Zusammenarbeit, die Ihr Ziel in ein nützliches und überprüfbares Ergebnis verwandelt.",
      inDevelopment: "In Entwicklung", openWorkspace: "Arbeitsbereich öffnen →", openAi: "KI-Arbeitsbereich öffnen →", installEyebrow: "XAVERT auf jedem Gerät", installTitle: "Ihr Arbeitsbereich ist nur einen Tipp entfernt.", installText: "Fügen Sie XAVERT zum Smartphone hinzu oder installieren Sie es auf dem Computer.", installGuide: "So geht es", installButton: "XAVERT installieren", installIos: "iPhone oder iPad: Öffnen Sie XAVERT in Safari, tippen Sie auf Teilen und dann Zum Home-Bildschirm.", installAndroid: "Android: Öffnen Sie das Browsermenü und wählen Sie App installieren oder Zum Startbildschirm hinzufügen.", installComputer: "Computer: Verwenden Sie in Chrome oder Edge das Installationssymbol in der Adressleiste oder das Browsermenü.", installNote: "Für die Nutzung der Tools ist weiterhin eine Internetverbindung erforderlich.",
      developerTitle: "Entwickler-Tools", developerDescription: "Code, SEO, strukturierte Daten und Webprojekte erstellen, formatieren, testen und verwalten.", documentTitle: "Dokument-Tools", documentDescription: "PDF- und Word-Dokumente direkt im Browser bearbeiten.", imageTitle: "Bild und Design", imageDescription: "Bilder, Grafiken, QR-Codes und visuelle Inhalte erstellen, prüfen und verbessern.", utilityTitle: "Alltags-Tools", utilityDescription: "Praktische Tools für Text, Sicherheit, Zeit, Maße und Dateien.", dataTitle: "Datenkonvertierung", dataDescription: "Tabellen und strukturierte Daten für Analyse und Berichte umwandeln.", aiTitle: "Tools für KI-Zusammenarbeit", aiDescription: "Bereiten Sie klarere KI-Anfragen vor und prüfen Sie Antworten, bevor Sie sie verwenden.", showMore: "Alle anzeigen", showLess: "Weniger anzeigen", openTool: "Tool öffnen  →", noResults: "Keine passenden Tools"
    },
    pt: {
      title: "XAVERT | Ferramentas, fluxos de trabalho e colaboração com IA", description: "Ferramentas rápidas no navegador, fluxos guiados e uma forma mais simples de trabalhar com inteligência artificial.",
      navTools: "Ferramentas", navWork: "Trabalho", navAi: "IA", languageLabel: "Idioma", exploreTools: "Explorar ferramentas", eyebrow: "O lado prático do trabalho digital",
      heroTitle: "Um espaço claro para ferramentas, documentos e IA.", heroText: "Resolva tarefas digitais com ferramentas rápidas, fluxos guiados e uma forma mais simples de colaborar com a inteligência artificial.", searchPlaceholder: "Pesquise uma ferramenta, formato ou tarefa...", trustTools: "57 ferramentas específicas", trustPrivacy: "Privado no navegador", trustSignup: "Sem cadastro",
      consoleTools: "Ferramentas rápidas", consoleToolsText: "Converter, limpar, criar e verificar", consoleWork: "Fluxos de trabalho", consoleWorkText: "Documentos e tarefas repetíveis", consoleAi: "Colaboração com IA", consoleAiText: "Da intenção humana a um resultado útil", consoleNote: "Seus arquivos permanecem no dispositivo sempre que a ferramenta permitir.",
      pathKicker: "Escolha o caminho certo", pathTitle: "Menos procura. Mais ação.", pathText: "Use uma ferramenta rápida, siga um fluxo completo ou prepare uma tarefa para a IA.", pathTools: "XAVERT Tools", pathToolsText: "Ferramentas rápidas para arquivos, código, dados, imagens e tarefas diárias.", browseTools: "Ver todas as ferramentas →", pathWork: "XAVERT Work", pathWorkText: "Etapas conectadas para documentos, escritório e processos repetíveis.", pathAi: "XAVERT AI", pathAiText: "Colaboração guiada que transforma seu objetivo em um resultado útil e verificável.",
      inDevelopment: "Em desenvolvimento", openWorkspace: "Abrir espaço de trabalho →", openAi: "Abrir espaço de IA →", installEyebrow: "XAVERT em todos os dispositivos", installTitle: "Seu espaço de trabalho a um toque.", installText: "Adicione o XAVERT ao celular ou instale-o no computador.", installGuide: "Como adicionar", installButton: "Instalar XAVERT", installIos: "iPhone ou iPad: abra o XAVERT no Safari, toque em Compartilhar e em Adicionar à Tela de Início.", installAndroid: "Android: abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial.", installComputer: "Computador: no Chrome ou Edge, use o ícone de instalação na barra de endereços ou o menu do navegador.", installNote: "Ainda é necessária uma conexão com a Internet para usar as ferramentas.",
      developerTitle: "Ferramentas para desenvolvedores", developerDescription: "Crie, formate, teste e gerencie código, SEO, dados estruturados e projetos web.", documentTitle: "Ferramentas de documentos", documentDescription: "Trabalhe com documentos PDF e Word diretamente no navegador.", imageTitle: "Imagem e design", imageDescription: "Crie, verifique e melhore imagens, gráficos, códigos QR e recursos visuais.", utilityTitle: "Ferramentas úteis", utilityDescription: "Ferramentas diárias para texto, segurança, tempo, medidas e arquivos.", dataTitle: "Conversão de dados", dataDescription: "Transforme planilhas e dados estruturados para análise e relatórios.", aiTitle: "Ferramentas de colaboração com IA", aiDescription: "Prepare pedidos mais claros para a IA e revise as respostas antes de utilizá-las.", showMore: "Mostrar tudo", showLess: "Mostrar menos", openTool: "Abrir ferramenta  →", noResults: "Nenhuma ferramenta encontrada"
    }
  };

  const languageSelect = document.getElementById("languageSelect");
  const supported = Object.keys(translations);

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  }

  function applyLanguage(language) {
    const code = supported.includes(language) ? language : "en";
    const copy = translations[code];
    document.documentElement.lang = code;
    document.title = copy.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", copy.description);

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = copy[element.dataset.i18n];
      if (value) element.textContent = value;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = copy[element.dataset.i18nPlaceholder];
      if (value) element.setAttribute("placeholder", value);
    });

    setText("#developer-tools", copy.developerTitle);
    setText("#developer-tools + .category-description", copy.developerDescription);
    setText("#document-tools", copy.documentTitle);
    setText("#document-tools + .category-description", copy.documentDescription);
    setText("#image-tools", copy.imageTitle);
    setText("#image-tools + .category-description", copy.imageDescription);
    setText("#utility-tools", copy.utilityTitle);
    setText("#utility-tools + .category-description", copy.utilityDescription);
    setText("#data-tools", copy.dataTitle);
    setText("#data-tools + .category-description", copy.dataDescription);
    setText("#ai-tools", copy.aiTitle);
    setText("#ai-tools + .category-description", copy.aiDescription);

    document.querySelectorAll(".card").forEach((card) => {
      card.dataset.openLabel = copy.openTool;
    });
    document.documentElement.style.setProperty("--open-tool-label", `"${copy.openTool}"`);

    document.querySelectorAll(".category-button").forEach((button) => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.dataset.originalText = copy.showMore;
      button.textContent = expanded ? copy.showLess : copy.showMore;
    });

    window.xavertLocale = { code, copy };
    languageSelect.value = code;
    localStorage.setItem("xavert-language", code);
    window.dispatchEvent(new CustomEvent("xavert:languagechange", { detail: window.xavertLocale }));
  }

  const saved = localStorage.getItem("xavert-language");
  const browserLanguage = navigator.language?.slice(0, 2).toLowerCase();
  applyLanguage(saved || (supported.includes(browserLanguage) ? browserLanguage : "en"));

  languageSelect?.addEventListener("change", () => applyLanguage(languageSelect.value));
})();
