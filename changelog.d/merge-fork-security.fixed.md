- Preserve scope-aware write authorization before rejecting malformed message
  text, and reject that text before explicit-policy DM opening as well.
- Apply sender framing to recipient-routed deliveries and protected attachment
  references, keeping file-fetch arguments separate from quoted names and MIME
  types so the references remain usable in backscroll and history.
