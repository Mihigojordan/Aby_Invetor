import { X, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import categoryService from '../../../services/categoryService';

const COLORS = {
  bg: "#F3F5F9",
  panel: "#ffffff",
  panel2: "#F5F7FB",
  ink: "#1B2536",
  muted: "#6A788D",
  line: "#E7EBF1",
  primary: "#3FABC6",
  primaryd: "#2B8EA6",
  primarysoft: "#E4F4F8",
  green: "#15A24A",
  greensoft: "#E6F6EC",
  red: "#E04848",
  redsoft: "#FDECEC",
  shadow: "0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)",
};

const PREDEFINED_CATEGORIES = {
  "Plumbing": {
    label: "Plumbing",
    subcategories: [
      "Pipes & Tubes (PVC, Copper, Metal)",
      "Faucets & Taps (Kitchen, Bathroom, Outdoor)",
      "Water Heaters & Tanks",
      "Toilets & Bidets",
      "Sinks & Basins",
      "Bathtubs & Showers",
      "Valves & Regulators",
      "Fittings & Connectors",
      "Pumps & Accessories",
      "Plumbing Tools & Equipment"
    ]
  },
  "Electricity": {
    label: "Electricity",
    subcategories: [
      "Wiring & Cables (Copper, Aluminum)",
      "Circuit Breakers & Panels",
      "Light Fixtures & Lamps",
      "Switches & Outlets",
      "Transformers & Power Supplies",
      "Junction Boxes & Conduits",
      "Motors & Generators",
      "Batteries & Chargers",
      "Electrical Tools",
      "Safety Devices & Breakers"
    ]
  },
  "Construction": {
    label: "Construction",
    subcategories: [
      "Concrete & Cement",
      "Bricks & Blocks (Clay, Concrete)",
      "Lumber & Wood (Planks, Beams, Studs)",
      "Steel & Metal Framing",
      "Insulation Materials (Foam, Fiberglass, Rock Wool)",
      "Drywall & Plasterboard",
      "Roofing Materials",
      "Scaffolding & Support Systems",
      "Adhesives & Bonding Agents",
      "Weatherproofing & Membranes"
    ]
  },
  "Painting": {
    label: "Painting",
    subcategories: [
      "Paint (Latex, Acrylic, Oil-based)",
      "Primers & Sealers",
      "Coatings & Varnishes",
      "Brushes & Rollers",
      "Paint Trays & Containers",
      "Spray Equipment",
      "Sandpaper & Surface Prep",
      "Drop Cloths & Masking Tape",
      "Thinner & Solvents",
      "Paint Mixing Equipment"
    ]
  },
  "Tools": {
    label: "Tools",
    subcategories: [
      "Hand Tools (Hammers, Wrenches, Screwdrivers)",
      "Power Tools (Drills, Saws, Grinders)",
      "Pneumatic Tools",
      "Measuring & Leveling Tools",
      "Cutting Tools (Blades, Bits, Chisels)",
      "Ladders & Scaffolding",
      "Tool Storage & Organization",
      "Tool Belts & Aprons",
      "Compressors & Generators",
      "Tool Maintenance & Accessories"
    ]
  },
  "Hardware": {
    label: "Hardware",
    subcategories: [
      "Nails (Finishing, Common, Roofing)",
      "Screws (Wood, Machine, Stainless)",
      "Bolts, Nuts & Washers",
      "Anchors & Plugs",
      "Hinges & Brackets",
      "Locks & Keys",
      "Chains & Cables",
      "Springs & Fasteners",
      "Magnetic & Metal Products",
      "Hardware Assortments"
    ]
  },
  "Doors & Windows": {
    label: "Doors & Windows",
    subcategories: [
      "Entry Doors (Steel, Wood, Fiberglass)",
      "Interior Doors",
      "Sliding & Folding Doors",
      "Windows (Wood, Vinyl, Aluminum)",
      "Sliding Windows",
      "Door Frames & Hardware",
      "Window Frames & Hardware",
      "Locks, Knobs & Handles",
      "Door & Window Seals",
      "Glass & Panes"
    ]
  },
  "Roofing": {
    label: "Roofing",
    subcategories: [
      "Roofing Shingles (Asphalt, Metal, Tile)",
      "Roof Tiles & Slates",
      "Gutters & Downspouts",
      "Flashing & Trim",
      "Roof Membranes & Underlayment",
      "Roof Fasteners & Hardware",
      "Ventilation & Vents",
      "Ice & Water Shield",
      "Sealants & Adhesives",
      "Roofing Tools & Accessories"
    ]
  },
  "Flooring": {
    label: "Flooring",
    subcategories: [
      "Ceramic & Porcelain Tiles",
      "Natural Stone Tiles (Marble, Granite, Slate)",
      "Wood Flooring (Hardwood, Engineered)",
      "Laminate Flooring",
      "Vinyl Flooring (Planks, Sheets)",
      "Carpeting & Underlayment",
      "Grout & Mortar",
      "Floor Adhesives",
      "Sealers & Finishes",
      "Flooring Tools & Accessories"
    ]
  },
  "Sanitation & Bathroom": {
    label: "Sanitation & Bathroom",
    subcategories: [
      "Toilets & Bidets",
      "Sinks & Basins (Pedestal, Wall, Corner)",
      "Bathtubs & Whirlpools",
      "Shower Enclosures & Screens",
      "Faucets & Accessories",
      "Towel Racks & Holders",
      "Medicine Cabinets",
      "Ventilation Fans",
      "Tiles & Cladding",
      "Bathroom Fixtures & Trim"
    ]
  },
  "Ventilation & HVAC": {
    label: "Ventilation & HVAC",
    subcategories: [
      "Exhaust Fans & Ductwork",
      "Air Conditioning Units",
      "Heating Systems",
      "Thermostats & Controls",
      "Ductwork & Fittings",
      "Filters & Maintenance",
      "Heat Recovery Systems",
      "Ventilation Grilles & Registers",
      "Insulation for HVAC",
      "HVAC Accessories"
    ]
  },
  "Safety Equipment": {
    label: "Safety Equipment",
    subcategories: [
      "Hard Hats & Head Protection",
      "Gloves (Work, Safety, Protective)",
      "Eye Protection (Goggles, Glasses)",
      "Hearing Protection",
      "Respiratory Protection & Masks",
      "Fall Protection (Harnesses, Lanyards)",
      "First Aid Kits",
      "Safety Signs & Warnings",
      "Fire Safety Equipment",
      "Personal Protective Equipment (PPE)"
    ]
  },
  "Adhesives & Sealants": {
    label: "Adhesives & Sealants",
    subcategories: [
      "Wood Glues & Adhesives",
      "Construction Adhesives",
      "Epoxy & Resins",
      "Caulk & Sealants (Silicone, Acrylic)",
      "Grout & Mortar",
      "Double-Sided Tape & Strips",
      "Sealant Guns & Tools",
      "Polyurethane Foam",
      "Waterproofing Sealants",
      "Specialty Adhesives"
    ]
  },
  "Landscaping & Outdoor": {
    label: "Landscaping & Outdoor",
    subcategories: [
      "Stones & Gravel",
      "Soil & Mulch",
      "Plants & Seeds",
      "Fencing Materials (Wood, Metal, Vinyl)",
      "Outdoor Furniture",
      "Garden Tools",
      "Lighting (Solar, Electric)",
      "Irrigation Systems",
      "Pavers & Stepping Stones",
      "Landscape Accessories"
    ]
  },
};

const UpsertCategoryModal = ({ isOpen, onClose, onSubmit, category, isLoading, title }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategory: ''
  });
  const [errors, setErrors] = useState({});
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        subcategory: category.subcategory || ''
      });
      if (category.name && PREDEFINED_CATEGORIES[category.name]) {
        setAvailableSubcategories(PREDEFINED_CATEGORIES[category.name].subcategories);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        subcategory: ''
      });
      setAvailableSubcategories([]);
    }
    setErrors({});
  }, [category, isOpen]);

  const validateForm = () => {
    const validation = categoryService.validateCategoryData(formData);
    setErrors(validation.errors.reduce((acc, err) => ({ ...acc, [err.split(' ')[0].toLowerCase()]: err }), {}));
    return validation.isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field, value) => {
    if (field === 'name') {
      setFormData(prev => ({ ...prev, [field]: value, subcategory: '' }));
      if (PREDEFINED_CATEGORIES[value]) {
        setAvailableSubcategories(PREDEFINED_CATEGORIES[value].subcategories);
      } else {
        setAvailableSubcategories([]);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: "16px"
    }}>
      <div style={{
        backgroundColor: COLORS.panel,
        borderRadius: "12px",
        boxShadow: COLORS.shadow,
        width: "100%",
        maxWidth: "480px",
        maxHeight: "90vh",
        overflowY: "auto",
        border: `1px solid ${COLORS.line}`
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: `1px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: COLORS.ink
            }}>
              {title}
            </h2>
            <p style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: COLORS.muted,
              fontWeight: 500
            }}>
              {category ? 'Update an existing category' : 'Create a new category'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "8px",
              color: COLORS.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.panel2;
              e.currentTarget.style.color = COLORS.ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = COLORS.muted;
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Category Name Dropdown */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.ink,
              marginBottom: "8px"
            }}>
              Category Name <span style={{ color: COLORS.red }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 12px",
                  border: `1px solid ${errors.name ? COLORS.red : COLORS.line}`,
                  backgroundColor: COLORS.panel2,
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: formData.name ? COLORS.ink : COLORS.muted,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "none",
                  paddingRight: "36px"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${COLORS.primarysoft}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.name ? COLORS.red : COLORS.line;
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">Select a category...</option>
                {Object.entries(PREDEFINED_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: COLORS.muted
                }}
              />
            </div>
            {errors.name && (
              <p style={{
                margin: "6px 0 0",
                fontSize: "12px",
                color: COLORS.red,
                fontWeight: 500
              }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Sub Category Dropdown */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.ink,
              marginBottom: "8px"
            }}>
              Sub Category
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={formData.subcategory}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                disabled={!formData.name}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 12px",
                  border: `1px solid ${COLORS.line}`,
                  backgroundColor: !formData.name ? COLORS.panel2 : COLORS.panel,
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: formData.subcategory ? COLORS.ink : COLORS.muted,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                  cursor: !formData.name ? "not-allowed" : "pointer",
                  opacity: !formData.name ? 0.6 : 1,
                  appearance: "none",
                  paddingRight: "36px"
                }}
                onFocus={(e) => {
                  if (formData.name) {
                    e.target.style.borderColor = COLORS.primary;
                    e.target.style.boxShadow = `0 0 0 3px ${COLORS.primarysoft}`;
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.line;
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">
                  {!formData.name ? "Select a category first..." : "Select a subcategory..."}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: !formData.name ? COLORS.line : COLORS.muted
                }}
              />
            </div>
            <p style={{
              margin: "6px 0 0",
              fontSize: "11px",
              color: COLORS.muted,
              fontWeight: 500
            }}>
              Optional: Select from predefined subcategories
            </p>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.ink,
              marginBottom: "8px"
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add details about this category..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${errors.description ? COLORS.red : COLORS.line}`,
                backgroundColor: COLORS.panel2,
                borderRadius: "8px",
                fontSize: "13px",
                color: COLORS.ink,
                outline: "none",
                resize: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primarysoft}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.description ? COLORS.red : COLORS.line;
                e.target.style.boxShadow = "none";
              }}
            />
            {errors.description && (
              <p style={{
                margin: "6px 0 0",
                fontSize: "12px",
                color: COLORS.red,
                fontWeight: 500
              }}>
                {errors.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: "flex",
            gap: "10px",
            paddingTop: "8px"
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel,
                color: COLORS.ink,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel2;
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.color = COLORS.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel;
                e.currentTarget.style.borderColor = COLORS.line;
                e.currentTarget.style.color = COLORS.ink;
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                background: isLoading
                  ? COLORS.primary
                  : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryd})`,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = `0 6px 15px rgba(63,171,198,.3)`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isLoading ? "Saving..." : (category ? "Update" : "Add")} Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsertCategoryModal;