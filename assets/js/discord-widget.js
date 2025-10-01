// Discord Widget Modal Handler
document.addEventListener('DOMContentLoaded', function() {
  const discordBtn = document.getElementById('discordFloatingBtn');
  const discordModal = document.getElementById('discordWidgetModal');
  const discordClose = document.querySelector('.discord-close');
  
  if (discordBtn && discordModal) {
    // Open modal on click
    discordBtn.addEventListener('click', function(e) {
      e.preventDefault();
      discordModal.style.display = 'block';
    });
    
    // Close modal on X click
    if (discordClose) {
      discordClose.addEventListener('click', function() {
        discordModal.style.display = 'none';
      });
    }
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
      if (e.target === discordModal) {
        discordModal.style.display = 'none';
      }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && discordModal.style.display === 'block') {
        discordModal.style.display = 'none';
      }
    });
  }
});
