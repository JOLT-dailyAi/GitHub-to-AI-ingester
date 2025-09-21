I need you to fetch and compare files from two different GitHub URL sets to identify content differences. Please follow this exact process:

1. **FETCH ALL FILES**: Use web_fetch to retrieve content from both URL sets:
   - Cached/Stable/Release URLs (first set)
   - Latest Branch Head URLs (second set)

2. **COMPARE CONTENT**: For each filename, compare the actual file content (not just URLs) to determine if files are identical or different.

3. **CREATE COMPARISON TABLE**: Generate a markdown table with exactly this format:
```markdown
# GitHub Repository File Comparison: Cached vs Latest

## Summary Overview
| **Status** | **Files Count** | **File Types** |
|------------|-----------------|----------------|
| ✅ **Identical** | [count] files | [list types] |
| 🔄 **Different** | [count] files | [list types] |
| **Total Analyzed** | **[total] files** | **All core application files** |

## Files with Differences Only
| **Filename** | **Cached \| Stable \| Release Analysis** | **Latest Commits Analysis** |
|--------------|-------------------------------------------|----------------------------|
| **📄 filename.ext 🎯** | [Detailed technical analysis of cached version capabilities, architecture, and implementation quality] | [Detailed technical analysis of latest version capabilities, architecture, and implementation quality] |

### Identical Files (No comparison needed):
✅ [list identical files with icons]
