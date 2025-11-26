/**
 * Example implementation mirroring the C++ CardAccess pattern
 * This demonstrates how to use the field defaults utility with access control fields
 */

import { FieldState, createFieldState, applyDefaultIfNeeded, setFieldValue, isFieldChanged, getFieldValue } from './field-defaults';

// Example access option types (similar to CardAccess::AccessOption)
export class AccessOption {
  constructor(public value: string = 'NONE') {}

  isDefaultValue(): boolean {
    return this.value === 'NONE' || this.value === '';
  }
}

export class DepositAccessOption {
  constructor(public value: string = 'NONE') {}

  isDefaultValue(): boolean {
    return this.value === 'NONE' || this.value === '';
  }
}

// Example field container (similar to FMField)
export interface FieldContainer {
  findRequisiteFMField(columnName: string): FieldState<AccessOption | DepositAccessOption>;
}

// Column name getters (similar to CardAccessTable static methods)
export class CardAccessTable {
  static getWithdrawalAccessColumnName(): string {
    return 'withdrawal_access';
  }

  static getDepositAccessColumnName(): string {
    return 'deposit_access';
  }

  static getInquiryAccessColumnName(): string {
    return 'inquiry_access';
  }

  static getPurchaseAccessColumnName(): string {
    return 'purchase_access';
  }

  static getThirdPartyAccessColumnName(): string {
    return 'third_party_access';
  }
}

/**
 * TypeScript implementation of the C++ pattern
 * Processes access fields and applies defaults if needed
 */
export function processCardAccessFields(
  field: FieldContainer,
  withdrawalAccessDefault: AccessOption,
  depositAccessDefault: DepositAccessOption,
  inquiryAccessDefault: AccessOption,
  purchaseAccessDefault: AccessOption,
  thirdPartyAccessDefault: AccessOption
): void {
  // Withdrawal Access
  const withdrawalAccessField = field.findRequisiteFMField(
    CardAccessTable.getWithdrawalAccessColumnName()
  );
  if (!isFieldChanged(withdrawalAccessField)) {
    const currentWithdrawalAccess = getFieldValue(withdrawalAccessField) as AccessOption;
    if (currentWithdrawalAccess.isDefaultValue()) {
      setFieldValue(withdrawalAccessField, withdrawalAccessDefault);
    }
  }

  // Deposit Access
  const depositAccessField = field.findRequisiteFMField(
    CardAccessTable.getDepositAccessColumnName()
  );
  if (!isFieldChanged(depositAccessField)) {
    const currentDepositAccess = getFieldValue(depositAccessField) as DepositAccessOption;
    if (currentDepositAccess.isDefaultValue()) {
      setFieldValue(depositAccessField, depositAccessDefault);
    }
  }

  // Inquiry Access
  const inquiryAccessField = field.findRequisiteFMField(
    CardAccessTable.getInquiryAccessColumnName()
  );
  if (!isFieldChanged(inquiryAccessField)) {
    const currentInquiryAccess = getFieldValue(inquiryAccessField) as AccessOption;
    if (currentInquiryAccess.isDefaultValue()) {
      setFieldValue(inquiryAccessField, inquiryAccessDefault);
    }
  }

  // Purchase Access
  const purchaseAccessField = field.findRequisiteFMField(
    CardAccessTable.getPurchaseAccessColumnName()
  );
  if (!isFieldChanged(purchaseAccessField)) {
    const currentPurchaseAccess = getFieldValue(purchaseAccessField) as AccessOption;
    if (currentPurchaseAccess.isDefaultValue()) {
      setFieldValue(purchaseAccessField, purchaseAccessDefault);
    }
  }

  // Third Party Access
  const thirdPartyAccessField = field.findRequisiteFMField(
    CardAccessTable.getThirdPartyAccessColumnName()
  );
  if (!isFieldChanged(thirdPartyAccessField)) {
    const currentThirdPartyAccess = getFieldValue(thirdPartyAccessField) as AccessOption;
    if (currentThirdPartyAccess.isDefaultValue()) {
      setFieldValue(thirdPartyAccessField, thirdPartyAccessDefault);
    }
  }
}

/**
 * More concise version using the utility function
 */
export function processCardAccessFieldsConcise(
  field: FieldContainer,
  defaults: {
    withdrawal: AccessOption;
    deposit: DepositAccessOption;
    inquiry: AccessOption;
    purchase: AccessOption;
    thirdParty: AccessOption;
  }
): void {
  const accessFields = [
    { field: field.findRequisiteFMField(CardAccessTable.getWithdrawalAccessColumnName()), default: defaults.withdrawal },
    { field: field.findRequisiteFMField(CardAccessTable.getDepositAccessColumnName()), default: defaults.deposit },
    { field: field.findRequisiteFMField(CardAccessTable.getInquiryAccessColumnName()), default: defaults.inquiry },
    { field: field.findRequisiteFMField(CardAccessTable.getPurchaseAccessColumnName()), default: defaults.purchase },
    { field: field.findRequisiteFMField(CardAccessTable.getThirdPartyAccessColumnName()), default: defaults.thirdParty },
  ];

  accessFields.forEach(({ field: accessField, default: defaultValue }) => {
    if (!isFieldChanged(accessField)) {
      const currentValue = getFieldValue(accessField) as AccessOption | DepositAccessOption;
      if (currentValue.isDefaultValue()) {
        setFieldValue(accessField, defaultValue);
      }
    }
  });
}



