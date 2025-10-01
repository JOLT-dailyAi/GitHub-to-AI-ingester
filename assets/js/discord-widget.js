// Discord Direct Link Handler
document.addEventListener('DOMContentLoaded', function() {
  const discordBtn = document.getElementById('discordFloatingBtn');
  
  if (discordBtn) {
    // Direct redirect to Discord server
    discordBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.open('https://discord.gg/AEJvSEWcZk', '_blank');
    });
  }
});
