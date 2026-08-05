function today() {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TEMPLATES = {
  employment: (p) => `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made and entered into on ${p.date || today()}, between ${p.employerName || '[Employer Name]'}, having its registered office at ${p.employerAddress || '[Employer Address]'} ("Employer"), and ${p.employeeName || '[Employee Name]'}, residing at ${p.employeeAddress || '[Employee Address]'} ("Employee").

1. POSITION AND DUTIES
The Employee is hereby appointed as ${p.designation || '[Designation]'} and shall report to ${p.reportingTo || '[Reporting Manager]'}. The Employee shall perform duties as reasonably assigned by the Employer.

2. COMPENSATION
The Employer shall pay the Employee a gross salary of ${p.salary || '[Salary Amount]'} per annum, payable in accordance with the Employer's standard payroll cycle.

3. TERM
This Agreement shall commence on ${p.startDate || '[Start Date]'} and shall continue until terminated in accordance with Section 5.

4. CONFIDENTIALITY
The Employee agrees to maintain the confidentiality of all proprietary information of the Employer, both during and after the term of employment, for a period of five (5) years following termination.

5. TERMINATION
Either party may terminate this Agreement by providing ${p.noticePeriod || '30'} days' written notice. The Employer may terminate immediately for cause, including misconduct or breach of this Agreement.

6. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of ${p.governingLaw || 'India'}, and the courts of ${p.jurisdiction || '[City]'} shall have exclusive jurisdiction.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

_______________________                _______________________
${p.employerName || '[Employer Name]'} (Employer)         ${p.employeeName || '[Employee Name]'} (Employee)`,

  nda: (p) => `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is made on ${p.date || today()}, between ${p.partyA || '[Disclosing Party]'} ("Disclosing Party") and ${p.partyB || '[Receiving Party]'} ("Receiving Party").

1. PURPOSE
The parties wish to explore ${p.purpose || 'a potential business relationship'} (the "Purpose"), during which the Disclosing Party may share confidential information.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by the Disclosing Party, whether written, oral, or in any other form, relating to the Purpose.

3. OBLIGATIONS
The Receiving Party shall: (a) use Confidential Information solely for the Purpose; (b) not disclose Confidential Information to any third party without prior written consent; and (c) protect Confidential Information using at least the same degree of care it uses for its own confidential information.

4. TERM
This Agreement shall remain in effect for ${p.term || '2 years'} from the date above, and confidentiality obligations shall survive for ${p.survivalPeriod || '5 years'} after termination.

5. EXCLUSIONS
Confidential Information does not include information that: is or becomes publicly available through no fault of the Receiving Party; was already known prior to disclosure; or is independently developed.

6. GOVERNING LAW
This Agreement shall be governed by the laws of ${p.governingLaw || 'India'}, with exclusive jurisdiction in the courts of ${p.jurisdiction || '[City]'}.

_______________________                _______________________
${p.partyA || '[Disclosing Party]'}                      ${p.partyB || '[Receiving Party]'}`,

  sale_deed: (p) => `SALE DEED

This Sale Deed is executed on ${p.date || today()} between ${p.sellerName || '[Seller Name]'} ("Seller") and ${p.buyerName || '[Buyer Name]'} ("Buyer").

1. PROPERTY DESCRIPTION
The Seller is the absolute owner of the property described as: ${p.propertyDescription || '[Property Description / Address / Survey Number]'} ("Property").

2. SALE CONSIDERATION
The Seller agrees to sell, and the Buyer agrees to purchase, the Property for a total consideration of ${p.saleAmount || '[Sale Amount]'}, receipt of which is hereby acknowledged.

3. TITLE AND POSSESSION
The Seller confirms clear and marketable title to the Property, free from encumbrances, and shall hand over vacant possession to the Buyer on ${p.possessionDate || '[Possession Date]'}.

4. INDEMNITY
The Seller shall indemnify the Buyer against any claim, defect in title, or encumbrance existing prior to the date of this Deed.

5. REGISTRATION
This Sale Deed shall be registered in accordance with the Registration Act, 1908, at the office of the Sub-Registrar, ${p.jurisdiction || '[City]'}.

6. GOVERNING LAW
This Deed shall be governed by the laws of ${p.governingLaw || 'India'}.

_______________________                _______________________
${p.sellerName || '[Seller Name]'} (Seller)             ${p.buyerName || '[Buyer Name]'} (Buyer)`,

  service_contract: (p) => `SERVICE AGREEMENT

This Service Agreement ("Agreement") is made on ${p.date || today()} between ${p.clientName || '[Client Name]'} ("Client") and ${p.providerName || '[Service Provider]'} ("Provider").

1. SCOPE OF SERVICES
The Provider shall provide the following services to the Client: ${p.scopeOfServices || '[Description of Services]'}.

2. FEES AND PAYMENT
The Client shall pay the Provider ${p.fees || '[Fee Amount]'}, payable ${p.paymentSchedule || 'monthly, within 15 days of invoice'}. Late payments shall accrue interest at 1.5% per month.

3. TERM AND TERMINATION
This Agreement shall commence on ${p.startDate || '[Start Date]'} and continue until completion of the Services, unless terminated earlier by either party upon ${p.noticePeriod || '30'} days' written notice.

4. INTELLECTUAL PROPERTY
All work product created under this Agreement shall be owned by the Client upon full payment, except for Provider's pre-existing tools and methodologies.

5. LIMITATION OF LIABILITY
Each party's aggregate liability under this Agreement shall not exceed the total fees paid in the preceding twelve (12) months, except in cases of gross negligence or willful misconduct.

6. GOVERNING LAW
This Agreement shall be governed by the laws of ${p.governingLaw || 'India'}, with exclusive jurisdiction in the courts of ${p.jurisdiction || '[City]'}.

_______________________                _______________________
${p.clientName || '[Client Name]'}                      ${p.providerName || '[Service Provider]'}`,

  lease: (p) => `LEASE AGREEMENT

This Lease Agreement ("Agreement") is made on ${p.date || today()} between ${p.landlordName || '[Landlord Name]'} ("Landlord") and ${p.tenantName || '[Tenant Name]'} ("Tenant").

1. PREMISES
The Landlord agrees to lease to the Tenant the premises located at: ${p.propertyAddress || '[Property Address]'} ("Premises").

2. TERM
The lease term shall commence on ${p.startDate || '[Start Date]'} and continue for ${p.leaseTerm || '11 months'}, renewable by mutual written consent.

3. RENT AND DEPOSIT
The Tenant shall pay monthly rent of ${p.monthlyRent || '[Monthly Rent]'}, due on the 5th of each month, and a refundable security deposit of ${p.securityDeposit || '[Security Deposit]'}.

4. MAINTENANCE
The Tenant shall maintain the Premises in good condition. Structural repairs shall be the responsibility of the Landlord.

5. TERMINATION
Either party may terminate this Agreement by providing ${p.noticePeriod || '30'} days' written notice. The Landlord may terminate immediately in case of non-payment of rent for 60 days or unlawful use of the Premises.

6. GOVERNING LAW
This Agreement shall be governed by the laws of ${p.governingLaw || 'India'}, with exclusive jurisdiction in the courts of ${p.jurisdiction || '[City]'}.

_______________________                _______________________
${p.landlordName || '[Landlord Name]'}                   ${p.tenantName || '[Tenant Name]'}`
};

const CONTRACT_TYPES = [
  { id: 'employment', label: 'Employment Agreement', fields: ['employerName','employerAddress','employeeName','employeeAddress','designation','reportingTo','salary','startDate','noticePeriod','governingLaw','jurisdiction'] },
  { id: 'nda', label: 'Non-Disclosure Agreement', fields: ['partyA','partyB','purpose','term','survivalPeriod','governingLaw','jurisdiction'] },
  { id: 'sale_deed', label: 'Sale Deed', fields: ['sellerName','buyerName','propertyDescription','saleAmount','possessionDate','governingLaw','jurisdiction'] },
  { id: 'service_contract', label: 'Service Contract', fields: ['clientName','providerName','scopeOfServices','fees','paymentSchedule','startDate','noticePeriod','governingLaw','jurisdiction'] },
  { id: 'lease', label: 'Lease Agreement', fields: ['landlordName','tenantName','propertyAddress','startDate','leaseTerm','monthlyRent','securityDeposit','noticePeriod','governingLaw','jurisdiction'] }
];

function generateContract(type, params) {
  const fn = TEMPLATES[type];
  if (!fn) throw new Error(`Unknown contract type: ${type}`);
  return fn(params || {});
}

module.exports = { generateContract, CONTRACT_TYPES };
