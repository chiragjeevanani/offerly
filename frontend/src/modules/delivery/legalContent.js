// Text of the delivery partner Terms and Privacy Policy (PartnerLegal.jsx renders
// it). Written to match what the partner app actually does - keep it in step
// when payouts, documents or the order flow change. Plain data, so a lawyer's
// edits only touch this file.

export const LEGAL_UPDATED = '27 October 2026';

export const PARTNER_TERMS = [
  {
    title: 'About these terms',
    body: [
      'These terms apply when you use the Offerly Delivery Partner app ("the app") to pick up orders from stores listed on Offerly and deliver them to customers. By signing up or using the app you agree to them.',
      'You work as an independent delivery partner, not as an employee of Offerly or of any store. You choose when to go online and which orders to accept.',
    ],
  },
  {
    title: 'Who can join',
    body: [
      'You must be at least 18 years old, hold a valid driving licence for the vehicle you use (not needed for a bicycle), and keep your vehicle roadworthy, registered and insured as the law requires.',
      'When you sign up you give your name, phone number, city, vehicle details, licence number and photos of your licence and ID proof. Offerly checks them before approving your account and may reject an application without giving a reason.',
      'Keep your details correct. Offerly may ask you to update documents at any time.',
    ],
  },
  {
    title: 'Taking and delivering orders',
    body: [
      'Only approved partners who are online see open orders, and only in their own city. The first partner to accept an order gets it. You can carry up to the number of orders Offerly sets at a time.',
      'If no partner accepts an order within the time Offerly sets, the app may assign it to an online partner automatically. New orders ring on your phone until you accept or reject them. You may reject an order that was assigned to you automatically, and that does not count against you.',
      'If you can no longer do an order before picking it up, release it in the app so another partner can take it. Releasing or cancelling orders you accepted yourself counts towards your cancellation limit (see "Targets, shifts and incentives"). Repeatedly accepting and releasing orders may lead to your account being reviewed.',
      'At the store, check the items (and any free gift) before tapping Confirm Pickup. Handle every order with care and deliver it without opening or tampering with it.',
      "Complete a delivery only after the customer gives you the 4-digit delivery code from their app. Never complete an order without the code, and never ask the customer to share the code before they receive the order.",
    ],
  },
  {
    title: "Orders you can't deliver",
    body: [
      "If the customer refuses the order, can't be reached or the address is wrong or unsafe, tap \"Contact Support\" on the order in the app and tell us what happened. Offerly support will try to reach the customer and tell you what to do next, which may include taking the order back to the same store the same day.",
      'Do not abandon, keep or hand an undeliverable order to anyone else without instructions from Offerly support. You do not earn a payout for an order that is returned. Keeping, selling or damaging the items is not allowed; any loss will be recovered from your earnings and may lead to your account being blocked.',
    ],
  },
  {
    title: 'Cash on delivery',
    body: [
      'Some cash-on-delivery orders are first confirmed by Offerly with a call to the customer before they reach the store. Prepaid orders go to the store directly.',
      'For cash-on-delivery orders, collect exactly the amount shown in the app, either in cash or by letting the customer scan the UPI QR code the app shows (the amount is already filled in), and record how you were paid. Do not ask for more, give discounts, or take payment to your personal UPI ID.',
      'Cash you collect belongs to Offerly and the store. The app shows it as cash in hand; hand it over to Offerly when you settle up. Unsettled cash may be deducted from what Offerly owes you.',
    ],
  },
  {
    title: 'Earnings and payouts',
    body: [
      'You earn the per-delivery payout Offerly sets for each order you deliver. Your earnings, bonuses and cash in hand are shown in the Wallet tab of the app.',
      'You can ask to withdraw your earnings from the Wallet on the schedule Offerly sets (for example daily, or weekly on a set day) and above any minimum amount shown in the app. Withdrawals are paid to the bank account or UPI ID you add in the app, usually after Offerly reviews the request. Offerly may reject a request that has wrong payout details or that is needed to recover unsettled cash.',
      'Offerly may change payout rates, targets and withdrawal schedules for future orders; earnings already shown in the app are not reduced except to recover unsettled cash or loss you caused.',
      'You are responsible for your own fuel, phone, data and vehicle costs and for any taxes on your earnings.',
    ],
  },
  {
    title: 'Targets, shifts and incentives',
    body: [
      'Offerly may run delivery targets (daily, weekly or monthly) that pay a bonus when you reach them. The app shows the active targets, your progress and any bonus you have earned. Bonuses are an incentive Offerly offers, not a guaranteed part of your earnings.',
      'Offerly may set a cancellation limit. If you release or cancel more orders in a target period than the limit allows (which may be zero), you do not earn target bonuses for that period. Orders assigned to you automatically and then rejected do not count.',
      'Offerly may also give you a shift: a start time, an end time, break minutes and days off, shown in the app and set by Offerly for each partner. To stay eligible for bonuses on a shift day you need to come online by the start time (within any grace period shown) and not stay offline longer than your allowed break during the shift. Missing this on a day can remove your bonus for the target periods that include that day.',
      'Shifts and targets only decide incentive eligibility. You are still free to go online or offline when you want.',
    ],
  },
  {
    title: 'Conduct and safety',
    body: [
      'Follow traffic laws and wear a helmet where required. Never use the app while riding - stop safely first.',
      "Be polite to customers and store staff. Use customers' phone numbers and addresses only to deliver their order, never for anything else, and do not keep or share them.",
      'Do not deliver while under the influence of alcohol or drugs, and do not carry anything illegal.',
    ],
  },
  {
    title: 'Suspension and closing your account',
    body: [
      'Offerly may suspend or block your account for breaking these terms, fraud, misuse of customer data, mishandled cash or orders, or repeated customer complaints. You can stop using the app at any time; settle any cash in hand and earnings due first.',
    ],
  },
  {
    title: 'Liability',
    body: [
      'Offerly provides the app as it is and does not promise a minimum number of orders or earnings. To the extent the law allows, Offerly is not responsible for accidents, injuries, fines or damage that happen while you deliver; you are responsible for your own conduct on the road.',
    ],
  },
  {
    title: 'Changes and contact',
    body: [
      'Offerly may update these terms. The date at the top shows the latest version; continuing to use the app after a change means you accept it.',
      'These terms are governed by the laws of India. For questions, contact Offerly partner support from the Profile tab in the app.',
    ],
  },
];

export const PARTNER_PRIVACY = [
  {
    title: 'What this policy covers',
    body: [
      'This policy explains what personal information the Offerly Delivery Partner app collects about you, why, and what choices you have. It applies to delivery partners; customers and stores have their own policies.',
    ],
  },
  {
    title: 'Information we collect',
    body: [
      'Account: your name, phone number (used to log in with a one-time code), email if you give one, city and profile photo.',
      'Verification: vehicle type and number, driving licence number, and the photos of your licence and ID proof you upload.',
      'Payouts: the bank account holder name, account number, IFSC code and/or UPI ID you add.',
      'Work records: when you go online and offline, your shift and break times, the orders you accept, reject, pick up, deliver, release or return, how you collected payment (cash or UPI), support requests you raise, your earnings, bonuses, withdrawal requests and settlements.',
      'Device: a notification token so we can send you order alerts, and basic technical logs (such as errors) needed to run the app.',
      'We do not track your live location. Directions open in your maps app, which handles location under its own policy.',
    ],
  },
  {
    title: 'How we use it',
    body: [
      'To verify you before approving your account, show you or assign you orders in your city, run deliveries and returns, record cash and earnings, work out target bonuses (including shift attendance and cancellations), process withdrawals and pay you, prevent fraud, send you order alerts and account notifications, and help you through support.',
    ],
  },
  {
    title: 'Who sees it',
    body: [
      'Customers and stores see your name and phone number for an order you have accepted, so they can reach you about that order. Customers never see your documents or bank details.',
      'Offerly admins see your account, documents and records to approve and support you and to settle payments.',
      'We use service providers to run the app - hosting, SMS for login codes, Firebase for notifications and our payment provider for payments - who handle data only for that purpose. We do not sell your personal information.',
      'We may share information when the law requires it, for example with the police or a court.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'We keep your account information while your account is open. Order, cash and payout records are kept as long as needed for accounting, tax and dispute purposes even after you leave.',
    ],
  },
  {
    title: 'Your choices and rights',
    body: [
      'You can see and update your profile, vehicle and payout details in the app. You can turn off notifications in your phone settings, but you may miss orders.',
      'You can ask us to correct your information or to close your account and delete what we no longer need to keep, by contacting partner support. Under the Digital Personal Data Protection Act, 2023 you can also raise a grievance with us about how your data is handled.',
    ],
  },
  {
    title: 'Security',
    body: [
      'Data travels to our servers over an encrypted (HTTPS) connection, and access to documents and bank details is limited to people who need it. No system is perfectly secure, so keep your phone locked and never share your login code.',
    ],
  },
  {
    title: 'Changes and contact',
    body: [
      'We may update this policy; the date at the top shows the latest version. For privacy questions or requests, contact Offerly partner support from the Profile tab in the app.',
    ],
  },
];
