"""The one data shape the external-effect functions pass around.

A Contact is what `pull` returns and what the rest of the pipeline keys on.
There is deliberately no Draft type: generated copy is the LLM's output, not a
structure this package owns — `send` takes a subject and a body string.
"""

from dataclasses import dataclass


@dataclass
class Contact:
    brand: str
    domain: str
    first_name: str
    last_name: str
    title: str
    email: str
    seniority: str
    email_status: str
    context: str = ""  # condensed org blob the LLM uses to personalize
