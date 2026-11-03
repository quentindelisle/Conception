/* Aperçu dans la Fabrique : la configuration en cours d'édition est lue dans le stockage du navigateur.
   Dans une appli exportée, ce fichier est remplacé par la configuration de l'activité. */
try { window.APP_CONFIG = JSON.parse(localStorage.getItem('fabrique_preview') || 'null'); } catch(e) { window.APP_CONFIG = null; }
