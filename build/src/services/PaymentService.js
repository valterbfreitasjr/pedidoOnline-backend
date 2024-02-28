"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const api_1 = require("../lib/api");
class PaymentService {
    process(order, customer, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const customerId = yield this.createCustomer(customer);
                console.log("CustomerID: ", customerId);
                const transaction = yield this.createTransaction(customerId, order, customer, payment);
                return {
                    transactionId: transaction.transactionId,
                    status: client_1.OrderStatus.PAID,
                };
            }
            catch (error) {
                console.error("Error on process payment: ", JSON.stringify(error, null, 2));
                return {
                    transactionId: "",
                    status: client_1.OrderStatus.CANCELED,
                };
            }
        });
    }
    createCustomer(customer) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const customerResponse = yield api_1.api.get(`/customers?email=${customer.email}`);
            if (((_b = (_a = customerResponse.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                return (_d = (_c = customerResponse.data) === null || _c === void 0 ? void 0 : _c.data[0]) === null || _d === void 0 ? void 0 : _d.id;
            }
            const customerParams = {
                name: customer.fullName,
                email: customer.email,
                mobilePhone: customer.mobile,
                cpfCnpj: customer.document,
                postalCode: customer.zipCode,
                address: customer.street,
                addressNumber: customer.number,
                complement: customer.complement,
                province: customer.neighborhood,
                notificationDisabled: true,
            };
            const response = yield api_1.api.post("/customers", customerParams);
            return (_e = response.data) === null || _e === void 0 ? void 0 : _e.id;
        });
    }
    createTransaction(customerId, order, customer, payment) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const paymentParams = {
                billingType: "CREDIT_CARD",
                creditCard: {
                    holderName: payment.creditCardHolder,
                    number: payment.creditCardNumber,
                    expiryMonth: (_a = payment.creditCardExpiration) === null || _a === void 0 ? void 0 : _a.split("/")[0],
                    expiryYear: (_b = payment.creditCardExpiration) === null || _b === void 0 ? void 0 : _b.split("/")[1],
                    ccv: payment.creditCardSecurityCode,
                },
                creditCardHolderInfo: {
                    name: customer.fullName,
                    email: customer.email,
                    cpfCnpj: customer.document,
                    postalCode: customer.zipCode,
                    addressNumber: customer.number,
                    addressComplement: customer.complement,
                    mobilePhone: customer.mobile,
                },
                customer: customerId,
                dueDate: new Date().toISOString(),
                value: order.total,
                description: `Pedido #${order.id}`,
                externalReference: order.id.toString(),
            };
            const response = yield api_1.api.post("/payments", paymentParams);
            return {
                transactionId: (_c = response.data) === null || _c === void 0 ? void 0 : _c.transactionId,
                gatewayStatus: (_d = response.data) === null || _d === void 0 ? void 0 : _d.status,
            };
        });
    }
}
exports.default = PaymentService;
