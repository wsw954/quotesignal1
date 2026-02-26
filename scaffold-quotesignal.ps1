<#
scaffold-quotesignal.ps1
Creates the skeleton folder/file structure for QuoteSignal (Next.js App Router).

Usage (from your project root):
  PowerShell> .\scaffold-quotesignal.ps1

Optional: preview what it would do (no changes):
  PowerShell> .\scaffold-quotesignal.ps1 -WhatIf

Optional: also create placeholder content in new files:
  PowerShell> .\scaffold-quotesignal.ps1 -AddStubs
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$AddStubs
)

$ErrorActionPreference = "Stop"

function Assert-ProjectRoot {
    if (-not (Test-Path -Path ".\package.json")) {
        throw "Run this script from the project root (the folder that contains package.json)."
    }
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path -Path $Path)) {
        if ($PSCmdlet.ShouldProcess($Path, "Create directory")) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        }
    }
}

function Ensure-File([string]$Path, [string]$Content = "") {
    if (-not (Test-Path -Path $Path)) {
        $dir = Split-Path -Parent $Path
        if ($dir) { Ensure-Dir $dir }

        if ($PSCmdlet.ShouldProcess($Path, "Create file")) {
            if ($AddStubs -and $Content -ne "") {
                # Create file with placeholder content
                Set-Content -Path $Path -Value $Content -Encoding UTF8
            }
            else {
                # Create empty file
                New-Item -ItemType File -Path $Path -Force | Out-Null
            }
        }
    }
}

Assert-ProjectRoot

# --- Directories to create (based on your skeleton) ---
$dirs = @(
    ".\app\intake\success",
    ".\app\api\vehicle\makes",
    ".\app\api\vehicle\models",
    ".\app\api\vehicle\trims",
    ".\app\api\intake",
    ".\app\(legal)\privacy",
    ".\app\(legal)\terms",

    ".\components\layout",
    ".\components\intake",
    ".\components\ui",

    ".\lib\airtable",
    ".\lib\validation",
    ".\lib\utils",

    ".\config"
)

foreach ($d in $dirs) { Ensure-Dir $d }

# --- Files to create ---
# Keep these minimal. You already have app/layout.js, app/globals.css, app/page.js from create-next-app.
$files = @(
    # Intake pages
    @{ path = ".\app\intake\page.js"; stub = "// Buyer Intake Form page (placeholder)`nexport default function IntakePage(){ return <div>Intake</div>; }`n" },
    @{ path = ".\app\intake\loading.js"; stub = "// Optional loading UI for /intake`nexport default function Loading(){ return <div>Loading…</div>; }`n" },
    @{ path = ".\app\intake\success\page.js"; stub = "// Success page after intake submit`nexport default function SuccessPage(){ return <div>Success</div>; }`n" },

    # API routes
    @{ path = ".\app\api\vehicle\makes\route.js"; stub = "// GET makes (placeholder)`nexport async function GET(){ return Response.json({ ok:true, data:[] }); }`n" },
    @{ path = ".\app\api\vehicle\models\route.js"; stub = "// GET models?makeId=... (placeholder)`nexport async function GET(){ return Response.json({ ok:true, data:[] }); }`n" },
    @{ path = ".\app\api\vehicle\trims\route.js"; stub = "// GET trims?modelId=... (placeholder)`nexport async function GET(){ return Response.json({ ok:true, data:[] }); }`n" },
    @{ path = ".\app\api\intake\route.js"; stub = "// POST intake submission -> Airtable (placeholder)`nexport async function POST(){ return Response.json({ ok:true }); }`n" },

    # Legal pages
    @{ path = ".\app\(legal)\privacy\page.js"; stub = "// Privacy Policy (placeholder)`nexport default function Privacy(){ return <div>Privacy Policy</div>; }`n" },
    @{ path = ".\app\(legal)\terms\page.js"; stub = "// Terms of Service (placeholder)`nexport default function Terms(){ return <div>Terms of Service</div>; }`n" },

    # Components
    @{ path = ".\components\layout\Header.jsx"; stub = "// Header (placeholder)`nexport default function Header(){ return <header>Header</header>; }`n" },
    @{ path = ".\components\layout\Footer.jsx"; stub = "// Footer (placeholder)`nexport default function Footer(){ return <footer>Footer</footer>; }`n" },

    @{ path = ".\components\intake\BuyerIntakeForm.jsx"; stub = "'use client';`n// Main form orchestrator (placeholder)`nexport default function BuyerIntakeForm(){ return <div>BuyerIntakeForm</div>; }`n" },
    @{ path = ".\components\intake\VehicleSelector.jsx"; stub = "'use client';`n// Make/Model/Trim selector (placeholder)`nexport default function VehicleSelector(){ return <div>VehicleSelector</div>; }`n" },
    @{ path = ".\components\intake\ContactSection.jsx"; stub = "'use client';`nexport default function ContactSection(){ return <div>ContactSection</div>; }`n" },
    @{ path = ".\components\intake\TradeInSection.jsx"; stub = "'use client';`nexport default function TradeInSection(){ return <div>TradeInSection</div>; }`n" },
    @{ path = ".\components\intake\FinancingSection.jsx"; stub = "'use client';`nexport default function FinancingSection(){ return <div>FinancingSection</div>; }`n" },
    @{ path = ".\components\intake\ReviewSubmit.jsx"; stub = "'use client';`nexport default function ReviewSubmit(){ return <div>ReviewSubmit</div>; }`n" },

    @{ path = ".\components\ui\Input.jsx"; stub = "'use client';`nexport default function Input(props){ return <input {...props} />; }`n" },
    @{ path = ".\components\ui\Select.jsx"; stub = "'use client';`nexport default function Select(props){ return <select {...props} />; }`n" },
    @{ path = ".\components\ui\Button.jsx"; stub = "'use client';`nexport default function Button({children, ...props}){ return <button {...props}>{children}</button>; }`n" },
    @{ path = ".\components\ui\Spinner.jsx"; stub = "'use client';`nexport default function Spinner(){ return <span>Loading…</span>; }`n" },
    @{ path = ".\components\ui\FormError.jsx"; stub = "'use client';`nexport default function FormError({message}){ if(!message) return null; return <div role='alert'>{message}</div>; }`n" },

    # lib/
    @{ path = ".\lib\airtable\client.js"; stub = "// Airtable client helpers (placeholder)`nexport function airtableClient(){ throw new Error('Not implemented'); }`n" },
    @{ path = ".\lib\airtable\vehicleData.js"; stub = "// getMakes/getModels/getTrims (placeholder)`nexport async function getMakes(){ return []; }`n" },
    @{ path = ".\lib\airtable\intakeSubmit.js"; stub = "// createRequestRecord (placeholder)`nexport async function createBuyerRequest(){ return { id:null }; }`n" },

    @{ path = ".\lib\validation\intakeSchema.js"; stub = "// Intake validation schema (placeholder)`nexport const intakeSchema = {};`n" },
    @{ path = ".\lib\utils\normalize.js"; stub = "// normalization helpers (placeholder)`nexport function normalizePhone(v){ return v; }`n" },
    @{ path = ".\lib\utils\rateLimit.js"; stub = "// optional rate limiting (placeholder)`nexport function rateLimit(){ return true; }`n" },

    # config
    @{ path = ".\config\env.md"; stub = "# Env Vars (QuoteSignal)`n`n- AIRTABLE_API_KEY`n- AIRTABLE_BASE_ID`n- AIRTABLE_MAKES_TABLE_ID`n- AIRTABLE_MODELS_TABLE_ID`n- AIRTABLE_TRIMS_TABLE_ID`n" }
)

foreach ($f in $files) {
    Ensure-File -Path $f.path -Content $f.stub
}

Write-Host "Scaffold complete. (Existing files were not overwritten.)"
Write-Host "Tip: run with -WhatIf to preview, or -AddStubs to include placeholder content."