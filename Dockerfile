FROM nginx:alpine

# корінь сайту
WORKDIR /usr/share/nginx/html

# копіюємо всю статику
COPY css ./css
COPY js ./js
COPY html ./html

# робимо стартову сторінку в корені, щоб nginx її бачив як index
COPY html/auth.html ./auth.html



# конфіг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
