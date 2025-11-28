FROM jekyll/jekyll:4.3.3

WORKDIR /srv/jekyll

COPY Gemfile Gemfile.lock* ./
RUN bundle install

EXPOSE 4000

CMD ["jekyll", "serve", "--host", "0.0.0.0", "--force_polling", "--livereload"]

