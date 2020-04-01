
/*
class Complex {
    constructor(real, imag) {
        if(typeof real === "number" && typeof imag === "number") {
            this.real = real;
            this.imag = imag;

        } else {
            //todo error?
        }
    }

    length() {
        return this.real * this.real + this.imag * this.imag;
    }

    static fromString(string) {
        const indexJ = string.indexOf("j");
        if(indexJ === -1) {      //real number
            const num = parseFloat(string);
            if(num) return new Complex(num, 0);
            else return null;

        } else {
            const indexP = string.lastIndexOf("+");
            const indexM = string.lastIndexOf("-");

            if(indexP === -1 && indexM === -1) {    //imaginary number
                if(indexJ === 0) string = string.substring(1);
                else string = string.substring(0, index);

                const num = parseFloat(string);
                if(num) return new Complex(0, num);
                else return null;

            } else {

            }
        }
    }


}
*/