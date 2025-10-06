# GitHub to AI Ingester

Transform any public GitHub repository into AI-ready structured output for seamless integration with Claude, GPT-4, and all major AI models.

---

## For Developers: Reference Implementation

This project serves dual purposes:
1. **Commercial Service**: Process GitHub repositories for AI consumption
2. **Reference Implementation**: Open-source frontend for developers building workflow-as-a-service platforms

### Why This Matters

If you're looking to monetize n8n/Make/Zapier workflows or sell API execution services, you’ve likely discovered there are very few comprehensive reference implementations available. While tools like Repomix address parts of the problem using a static, all-in-one dump of repository contents, GitHub-to-AI-ingester uniquely focuses on up-to-date, token-efficient, and fetch-on-demand workflows that enable real-time AI analysis.

This frontend solves that gap.

### Features You Can Study & Adapt

- **Anti-Abuse Free Trial System**: Monthly hash-based trial keys with SHA-256 validation against used-keys database
- **VPN Detection**: Multi-method detection (timezone mismatch, WebRTC leaks, DNS analysis) with graceful fallbacks
- **License Key Validation**: Gumroad API integration with real-time credit checking and debounced validation
- **Webhook Architecture**: Cloudflare Workers integration with proper timeout handling and state management
- **Maintenance Windows**: IST timezone-aware automatic maintenance mode with countdown timers
- **Dynamic State Management**: Handles processing, maintenance, and error states with proper button replacement
- **Virtual Showcase System**: Data-driven architecture for displaying results without DOM bloat
- **Repository Validation**: GitHub API integration with intelligent URL cleaning and accessibility checks

### Usage Terms

- Frontend code is open source under MIT License (see LICENSE file)
- Study, learn from, and adapt for your own projects
- Attribution appreciated but not required
- **Backend workflows are proprietary and not included**
- See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for collaboration guidelines

### Not Just Another SaaS Template

Unlike generic SaaS starters that focus on subscription management and user authentication, this implements:
- **Per-execution billing** (credits, not subscriptions)
- **Stateless free trials** (no database required for trial tracking)
- **Client-side abuse prevention** (reduces backend load)
- **Webhook-based processing** (decoupled frontend/backend)

---

## Why This Exists

Finding GitHub repositories is easy - search returns dozens of candidates. The challenge is verifying which one is actually worth using.

Paste a GitHub URL into Claude or ChatGPT? The AI gets the README, not the code. It can't access actual files, directory structure, or implementation details without manual raw URL construction.
  
This service automates verification: submit any public repository, receive complete structure with direct file URLs, feed to any AI for informed analysis instead of surface-level recommendations.

**Read the full analysis:** [Why This Exists](BLOG-why-github-to-ai-ingester-exists.md)

---

## What It Does

GitHub to AI Ingester processes public GitHub repositories and delivers a comprehensive, structured text file containing:

- Complete repository structure with visual tree hierarchy
- File metadata (sizes, paths, types)
- Direct access URLs for all repository contents
- Technology stack analysis
- Formatted output optimized for AI model consumption

No manual navigation, no copying files one by one, no formatting headaches.

## Features

- **Universal AI Compatibility**: Works with Claude, GPT-4, Gemini, and any AI model
- **Complete Repository Mapping**: Captures entire repo structure and metadata
- **Dual URL Format**: Provides both cached (stable) and latest branch HEAD URLs
- **Technology Detection**: Automatically identifies tech stack and project type
- **Fast Processing**: Most repositories processed within 5-10 minutes
- **Multiple Delivery Methods**: Receive via email and Discord DM
- **Free Trial Available**: Test the service with one free repository processing

## How It Works

1. **Get Credits**: Purchase processing credits via [Gumroad](https://joltdailyai.gumroad.com/l/github-to-ai-ingester) or use your free trial
2. **Submit Repository**: Enter your license key and GitHub repository URL
3. **Receive Output**: Get a structured text file via email within 5-10 minutes
4. **Feed to AI**: Provide the output file to your AI model of choice

The AI will process the structured output automatically. Simply paste the content and let the AI handle the rest.

## Alternatives & Comparison

There are other tools that aim to help AI systems analyze GitHub repositories. The most notable is **Repomix**, which creates a full, static export of a repository’s code in a single file. However, GitHub-to-AI-ingester takes a different, more flexible approach that’s optimized for modern, web-enabled AIs and scalable automation.

| Feature/Aspect         | GitHub-to-AI-ingester                                      | Repomix                                  |
|-----------------------|------------------------------------------------------------|------------------------------------------|
| **Output focus**      | Lightweight, URL-driven, real-time, version comparison     | Full code dumped into a static file      |
| **Token efficiency**  | Only fetch what’s needed; low token use for initial scan   | High token use for complete code review  |
| **Use case**          | AIs with web access, dynamic/live workflows                | Offline analysis, static single-prompt   |
| **Version awareness** | Dual URLs for version diff (cached & latest)               | Snapshot only, not for live comparison   |
| **Suitability**       | Large or dynamic repos, scalable audits, automation        | Deep, all-in-one codebase review         |

**Summary:**  
While Repomix is great for full offline, single-shot reviews, GitHub-to-AI-ingester is purpose-built for efficiency, automation, up-to-date analysis, and modern “fetch what you need” workflows with AIs that support web access.

### Summary for Users

- **Full compatibility:** All AI models can use the output generated by GitHub-to-AI-ingester.
- **Optimal experience:** AIs or agents that can fetch URLs directly will have a seamless and scalable workflow for code analysis and auditing.
- **Fallback:** For AIs that cannot fetch URLs, users simply provide (paste) the necessary file links or contents as needed—still far easier and more efficient than manual repository navigation.

## Use Cases

- **Code Analysis**: Feed entire codebases to AI for review and suggestions
- **Documentation Generation**: Let AI analyze and document your repositories
- **Learning & Research**: Study repository structures and implementations
- **Project Planning**: Analyze existing projects before starting similar ones
- **Code Migration**: Understand legacy codebases for modernization
- **Security Audits**: Review repository contents systematically

## Pricing

- **Free Trial**: 1 repository processing (one-time per user per month)
- **Credit Packs**: 10 or 20 credits available with early bird discounts
- **No Subscription**: One-time purchase, use credits whenever needed, they never expire

Visit our [Gumroad store](https://joltdailyai.gumroad.com/l/github-to-ai-ingester) for current pricing.

## Getting Started

### Prerequisites

- A public GitHub repository URL
- Valid email address
- (Optional) Discord User ID for notifications

### Free Trial

1. Visit [https://jolt-dailyai.github.io/GitHub-to-AI-ingester/](https://jolt-dailyai.github.io/GitHub-to-AI-ingester/)
2. Click "Try once for free"
3. Enter your email and repository URL
4. Copy the generated trial key
5. Paste into the main form and submit

### Paid Processing

1. Purchase credits from [Gumroad](https://joltdailyai.gumroad.com/l/github-to-ai-ingester)
2. Receive license key via email
3. Enter license key and repository URL on our website
4. Submit and await processing completion

## Output Format

The delivered text file contains:

```
════════════════════════════════════════════════════════════════════════════════
📊 REPOSITORY: REPOSITORY_NAME (👤 OWNER)
════════════════════════════════════════════════════════════════════════════════
🌐 Repository Type
🔗 https://github.com/owner/repo

📊 STATS
├── 📏 Size: X.XX MB
├── 📁 Directories: XX
├── 📄 Files: XXX
└── 🏗️ Max Depth: X

⏰ Generated: [Timestamp]
════════════════════════════════════════════════════════════════════════════════

🌳 REPOSITORY STRUCTURE:
[Complete tree visualization]

💡 TECH STACK:
[Detected technologies]

📊 FILE DETAILS:
[Complete file listings with URLs]

🤖 AI Note: [Processing instructions for AI models]
```

## Showcase

Browse processed repository examples on our website to see the output quality and format.

## Support & Community

- **Discord Server**: [Join for support and updates](https://discord.gg/AEJvSEWcZk)
- **Support Tickets**: [Raise a ticket](https://discord.com/channels/1418598232518557698/1418599291051573288) in our Discord server
- **Reviews**: Share your experience via our [review form](https://forms.gle/cF5izZhej5GZ8M1k7)

## Technology Stack

- HTML/CSS/JavaScript frontend
- Cloudflare Workers for webhook processing
- n8n automation for repository processing
- GitHub API integration

## Limitations

- **Public Repositories Only**: Cannot process private repositories.
- **Repository Size**: Very large repositories may take longer to process.
- **Rate Limits**: Processing queue managed to respect GitHub API limits.
- **Maintenance Window**: System maintenance 19:35–19:45 UTC daily.
- **Flexible AI Compatibility**: While designed for AIs (and workflows) that can access URLs for direct, on-demand file fetching, the output is also compatible with any AI model. For AIs that cannot follow URLs automatically, simply provide (paste) the needed file contents when requested—as indicated in the AI Note.
- **Snapshot-Based Alternatives Exist**: Tools like Repomix create static codebase snapshots, but require re-running for every update. GitHub-to-AI-ingester generates an always-current, URL-driven map that only needs to be run once.
- **GitHub Dependency**: Relies on GitHub remaining accessible for raw file URLs; outages or API permission changes may temporarily disrupt functionality.

## Frequently Asked Questions

**Q: How long does processing take?**  
A: Most repositories are processed within 5-10 minutes. Larger repositories may take longer.

**Q: Can I process private repositories?**  
A: Currently only public GitHub repositories are supported.

**Q: What happens if processing fails?**  
A: You'll receive a job_id when you hit "Process Repository". Track your request using the job_id in Discord. If you encounter issues, wait 24 hours before raising a support ticket at our [Discord support channel](https://discord.com/channels/1418598232518557698/1418599291051573288).

**Q: Can I get a refund?**  
A: **No refunds allowed.** Processing costs are incurred immediately upon workflow execution, making refunds unfeasible. No credits will be granted for duplicate requests. Use your credits wisely. Support tickets related to refund requests will be denied.

**Q: Do credits expire?**  
A: No, purchased credits never expire.

**Q: What AI models are supported?**  
A: The output works with any AI model that can process text input, including Claude, GPT-4, Gemini, and others.

**Q: Isn’t this already solved by other tools like Repomix?**

**A:** Repomix and similar tools offer a static, snapshot-based export of GitHub repositories—meaning you need to run them again every time the repo updates, and each output is a heavy one-off dump.  
GitHub-to-AI-ingester is different:  
- It only needs to be run **once** to generate an output that always points to both the stable (cached) and latest versions of every file in the repository.  
- The output contains direct URLs for all files, so your AI or agent can be instructed to fetch only the files (or versions) you want, whenever you want—without needing to reprocess the repo for every update.
- This makes it truly token-efficient, real-time, and ideal for scalable, dynamic auditing—your AI can “cherry-pick” files as needed rather than having to load everything at once.

**In short:**  
You get a lightweight, always-current file map for selective, on-demand code fetching and version comparison—unlike traditional snapshot tools that must be rerun for every change.


## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

## License

Proprietary - Commercial Service

## Contact

- Website: [https://jolt-dailyai.github.io/GitHub-to-AI-ingester/](https://jolt-dailyai.github.io/GitHub-to-AI-ingester/)
- Discord: [Support Server](https://discord.gg/AEJvSEWcZk)
- Gumroad: [Purchase Credits](https://joltdailyai.gumroad.com/l/github-to-ai-ingester)

---

**Made with ⚡ by JOLT-dailyAi**
