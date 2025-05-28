<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amateurfunkrufzeichen Morse Quiz (c) 2025 DB4REB </title>
    <!-- Bootstrap 5 Dark Mode CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link id="theme-css" href="css/themes/bootstrap-dark.min.css" rel="stylesheet">    
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <!-- Open Graph Meta Tags for Link Preview -->
    <meta property="og:title" content="Amateurfunkrufzeichen Morse Quiz by DB4REB" />
    <meta property="og:description" content="Trainiere und übe Amateurfunkrufzeichen als Morsecode (CW) – direkt im Browser, mobil und am Desktop!" />
    <meta property="og:image" content="https://rebelba42.4lima.de/mcode/images/screenshot_main.jpg" />
    <meta property="og:url" content="https://rebelba42.4lima.de/mcode/" />
    <meta property="og:type" content="website" />
</head>
<body class="bg-dark text-light">
    <!-- Main container for the app -->
    <div class="container py-4">
        <!-- Header with title and language selection -->
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-4">
            <h1 class="mb-0" id="headline">Amateurfunkrufzeichen Morse Quiz</h1>
            <div id="language-select"></div>
        </div>
        <!-- Quiz content area -->
        <div id="quiz-container" class="mb-4"></div>
        <!-- Controls (start, pause, next, etc.) -->
        <div id="controls" class="mb-4"></div>
        <!-- Settings form (speed, noise, etc.) -->
        <div id="settings" class="mb-4"></div>
        <!-- Result display -->
        <div id="result" class="mb-4"></div>
    </div>
    <!-- Footer with license and GitHub link -->
    <footer class="bg-secondary bg-gradient text-light py-3 mt-5">
        <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center">
            <div>
                <span class="fw-bold">CallSign Trainer</span> &copy; 2025 DB4REB
                &middot; <a href="https://github.com/RebElba42/CallSignTrainer/blob/main/LICENSE" class="link-light link-underline-opacity-0" target="_blank">MIT License</a>
            </div>
            <div class="small mt-2 mt-md-0">
                <span>Source code on <a href="https://github.com/RebElba42/CallSignTrainer" class="link-light" target="_blank">GitHub</a></span>
                &middot; <span>Made for myself & CW fans <span style="color:#00bcd4;">&#128225;</span> </span>
            </div>
        </div>
    </footer>
    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Main JavaScript for the app -->
    <script src="js/app.js"></script>
</body>
</html>